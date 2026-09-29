// Minimal MeTube API client. Only imported by the service worker: every
// network call goes through background.js.

import { t } from './i18n.js';

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

/** "Basic …" header value, or null when no credentials are set. */
export function basicAuth(username, password) {
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
 * fetch() with the Basic auth header, a timeout, and network failures turned
 * into MeTubeErrors. `credentials: 'omit'` keeps the browser from showing its
 * own login prompt on a 401.
 * @param {{username: string, password: string}} settings
 * @param {string} url  Absolute URL on the MeTube host.
 * @returns {Promise<{res: Response, text: string, host: string}>}
 */
async function authedFetch(
  settings,
  url,
  { method = 'GET', headers = {}, body, timeoutMs = 15000, readBody = true } = {},
) {
  const host = new URL(url).host;
  const allHeaders = { ...headers };
  const auth = basicAuth(settings.username, settings.password);
  if (auth) allHeaders.Authorization = auth;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: allHeaders,
      body,
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
    let text = '';
    if (readBody) text = await res.text();
    else res.body?.cancel().catch(() => {});
    return { res, text, host };
  } catch (err) {
    if (controller.signal.aborted) {
      throw new MeTubeError('timeout', t('errTimeout', host, timeoutMs / 1000));
    }
    throw new MeTubeError('network', t('errNetwork', host, err.message));
  } finally {
    clearTimeout(timer);
  }
}

function throwForStatus(res, text, host, url) {
  switch (res.status) {
    case 401:
      throw new MeTubeError('auth', t('errAuth'));
    case 403:
      throw new MeTubeError('forbidden', t('errForbidden', host));
    case 404:
      throw new MeTubeError('not_found', t('errNotFound', url));
    case 400:
      throw new MeTubeError('bad_request', t('errBadRequest', badRequestReason(res, text)));
  }
  if (!res.ok) {
    throw new MeTubeError('http', t('errHttp', host, `${res.status}${res.statusText ? ` ${res.statusText}` : ''}`));
  }
}

/**
 * JSON API call.
 * @param {{baseUrl: string, username: string, password: string}} settings
 * @param {string} path  e.g. "/add"
 */
async function request(settings, path, { method = 'GET', body, timeoutMs } = {}) {
  const url = `${settings.baseUrl}${path}`;
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const { res, text, host } = await authedFetch(settings, url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    timeoutMs,
  });
  throwForStatus(res, text, host, url);

  try {
    return JSON.parse(text);
  } catch {
    throw new MeTubeError('bad_response', t('errNotJson', host));
  }
}

/** GET /version → {"yt-dlp": "...", "version": "..."} */
export function getVersion(settings) {
  return request(settings, '/version');
}

/** GET /history → {queue: [...], pending: [...], done: [...]} */
export function getHistory(settings) {
  return request(settings, '/history');
}

/**
 * Check a downloaded file can be fetched with the stored credentials before
 * handing its URL to <video>, which only reports a generic error.
 * Requests a single byte; the rest of the body is never downloaded.
 */
export async function probeFile(settings, url) {
  const { res, host } = await authedFetch(settings, url, { headers: { Range: 'bytes=0-0' }, readBody: false });
  if (res.status === 404) {
    throw new MeTubeError('file_missing', t('errFileMissing'));
  }
  throwForStatus(res, '', host, url);
  return { contentType: res.headers.get('content-type') };
}

/** Text of a small file (subtitles), or null if it can't be fetched. */
export async function fetchText(settings, url) {
  try {
    const { res, text } = await authedFetch(settings, url, { timeoutMs: 10000 });
    return res.ok ? text : null;
  } catch {
    return null;
  }
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
  // Subtitles-only downloads (download_type "captions").
  if (options.subtitleLanguage) body.subtitle_language = options.subtitleLanguage;
  if (options.subtitleMode) body.subtitle_mode = options.subtitleMode;

  // Playlists are expanded server-side before /add answers: allow time.
  const data = await request(settings, '/add', { method: 'POST', body, timeoutMs: 120000 });
  if (data?.status === 'ok') return data;
  if (data?.status === 'error') {
    throw new MeTubeError('metube', data.msg ? String(data.msg) : t('errMeTube'));
  }
  throw new MeTubeError('bad_response', t('errUnexpectedAdd'));
}

/**
 * POST /delete: remove a finished download from MeTube's list and ask for its
 * files to be deleted. MeTube only deletes them when it runs with
 * DELETE_FILE_ON_TRASHCAN=ask (or true); with the default (false) the file
 * stays on disk: the caller checks.
 * @param {string} key  The history item's `url`, MeTube's key for it.
 */
export async function deleteDownload(settings, key) {
  const data = await request(settings, '/delete', {
    method: 'POST',
    body: { ids: [key], where: 'done', delete_files: true },
  });
  if (data?.status === 'ok') return data;
  throw new MeTubeError('metube', data?.msg ? String(data.msg) : t('errDeleteFailed'));
}
