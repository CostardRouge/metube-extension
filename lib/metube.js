// Minimal MeTube API client. Only imported by the service worker: every
// network call goes through background.js.

export class MeTubeError extends Error {
  /**
   * @param {'config'|'permission'|'network'|'timeout'|'auth'|'forbidden'|'not_found'|'bad_request'|'http'|'bad_response'|'metube'} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'MeTubeError';
    this.code = code;
  }

  /** Errors that will fail every request the same way. */
  get fatal() {
    return ['config', 'permission', 'network', 'timeout', 'auth', 'forbidden', 'not_found'].includes(this.code);
  }
}

function basicAuth(username, password) {
  if (!username && !password) return null;
  // btoa() only takes Latin-1; encode as UTF-8 first.
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `Basic ${btoa(binary)}`;
}

function badRequestReason(res, text) {
  // HTTP/2 has no reason phrase, so statusText is often empty behind a
  // TLS-terminating proxy; aiohttp also puts the reason in the body.
  if (res.statusText && !/^bad request$/i.test(res.statusText)) return res.statusText;
  try {
    const data = JSON.parse(text);
    if (data?.msg || data?.error || data?.reason) return String(data.msg || data.error || data.reason);
  } catch {
    // Not JSON.
  }
  const body = text.replace(/^\s*400:\s*/, '').trim();
  if (body && body.length <= 300 && !body.startsWith('<')) return body;
  return res.statusText || 'Bad Request';
}

/**
 * @param {{baseUrl: string, username: string, password: string}} settings
 * @param {string} path  e.g. "/add"
 */
async function request(settings, path, { method = 'GET', body, timeoutMs = 15000 } = {}) {
  const url = `${settings.baseUrl}${path}`;
  const host = new URL(url).host;
  const headers = { Accept: 'application/json' };
  const auth = basicAuth(settings.username, settings.password);
  if (auth) headers.Authorization = auth;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  let text;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
    text = await res.text();
  } catch (err) {
    if (controller.signal.aborted) {
      throw new MeTubeError('timeout', `${host} did not answer within ${timeoutMs / 1000}s.`);
    }
    throw new MeTubeError('network', `Can't reach ${host} (${err.message}). Check the URL and that MeTube is running.`);
  } finally {
    clearTimeout(timer);
  }

  switch (res.status) {
    case 401:
      throw new MeTubeError('auth', 'Authentication failed (401): check the username and password.');
    case 403:
      throw new MeTubeError('forbidden', `Access denied (403) by ${host}.`);
    case 404:
      throw new MeTubeError('not_found', `Not found (404): ${url}. Check the base URL, including any path prefix.`);
    case 400:
      throw new MeTubeError('bad_request', `MeTube rejected the request (400): ${badRequestReason(res, text)}`);
  }
  if (!res.ok) {
    throw new MeTubeError('http', `${host} answered HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}.`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new MeTubeError(
      'bad_response',
      `${host} did not answer with JSON. Is the base URL right, or is a login page in the way?`,
    );
  }
}

/** GET /version → {"yt-dlp": "...", "version": "..."} */
export function getVersion(settings) {
  return request(settings, '/version');
}

/**
 * POST /add
 * @param {object} settings  baseUrl + credentials
 * @param {string} url       Media URL to download.
 * @param {{downloadType: string, quality: string, format: string, folder?: string}} options
 */
export async function addDownload(settings, url, options) {
  const body = {
    url,
    download_type: options.downloadType,
    quality: options.quality,
    format: options.format,
    auto_start: true,
  };
  if (options.folder) body.folder = options.folder;

  // Playlists are expanded server-side before /add answers: allow time.
  const data = await request(settings, '/add', { method: 'POST', body, timeoutMs: 120000 });
  if (data?.status === 'ok') return data;
  if (data?.status === 'error') {
    throw new MeTubeError('metube', data.msg ? String(data.msg) : 'MeTube reported an error.');
  }
  throw new MeTubeError('bad_response', 'Unexpected answer from MeTube /add.');
}
