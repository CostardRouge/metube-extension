// Detection and normalization of YouTube URLs.
// Shared by the service worker (context menus) and the popup (page scan).

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const LIST_ID_RE = /^[A-Za-z0-9_-]{2,64}$/;
const TIMESTAMP_RE = /^(?:\d+|(?:\d+h)?(?:\d+m)?(?:\d+s)?)$/;

// Account-bound lists (Watch later, Liked videos, Liked music) can't be
// fetched by MeTube without cookies, so they are dropped.
const PRIVATE_LISTS = new Set(['WL', 'LL', 'LM']);

const MAIN_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const MUSIC_HOST = 'music.youtube.com';
const SHORT_HOSTS = new Set(['youtu.be', 'www.youtu.be']);
const EMBED_HOSTS = new Set(['youtube-nocookie.com', 'www.youtube-nocookie.com']);

/**
 * @typedef {object} YouTubeLink
 * @property {string} url   Normalized URL: only v, list and t are kept.
 * @property {'video'|'short'|'playlist'} kind
 * @property {string} id    Video ID, or playlist ID for kind "playlist".
 * @property {string|null} list  Playlist ID attached to a video, if any.
 * @property {string} key   Identity used for de-duplication (ignores t).
 */

/**
 * Recognize a YouTube video, short or playlist URL and normalize it.
 * youtu.be, m.youtube.com, /live/ and /embed/ links are rewritten to the
 * canonical www.youtube.com form; tracking params (si, pp, feature, index…)
 * are dropped.
 * @param {string} input
 * @param {string} [base] Base URL for relative hrefs.
 * @returns {YouTubeLink|null}
 */
export function parseYouTubeUrl(input, base) {
  let u;
  try {
    u = new URL(String(input).trim(), base);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;

  const host = u.hostname.toLowerCase();
  const [first, second] = u.pathname.split('/').filter(Boolean);
  const params = u.searchParams;

  let origin = 'https://www.youtube.com';
  let videoId = null;
  let shortId = null;
  let listId = params.get('list');
  let t = params.get('t');

  if (SHORT_HOSTS.has(host)) {
    videoId = first;
  } else if (MAIN_HOSTS.has(host) || host === MUSIC_HOST || EMBED_HOSTS.has(host)) {
    if (host === MUSIC_HOST) origin = 'https://music.youtube.com';
    if (EMBED_HOSTS.has(host) && first !== 'embed') return null;
    switch (first) {
      case 'watch':
        videoId = params.get('v');
        break;
      case 'playlist':
        break;
      case 'shorts':
        shortId = second;
        listId = null;
        break;
      case 'live':
        videoId = second;
        break;
      case 'embed':
        if (second !== 'videoseries') videoId = second;
        t = t ?? params.get('start');
        break;
      default:
        return null;
    }
  } else {
    return null;
  }

  if (videoId && !VIDEO_ID_RE.test(videoId)) videoId = null;
  if (shortId && !VIDEO_ID_RE.test(shortId)) shortId = null;
  if (listId && (!LIST_ID_RE.test(listId) || PRIVATE_LISTS.has(listId))) listId = null;
  if (t && !TIMESTAMP_RE.test(t)) t = null;

  if (shortId) {
    return {
      url: `https://www.youtube.com/shorts/${shortId}`,
      kind: 'short',
      id: shortId,
      list: null,
      key: `video:${shortId}:`,
    };
  }

  if (videoId) {
    const out = new URL(`${origin}/watch`);
    out.searchParams.set('v', videoId);
    if (listId) out.searchParams.set('list', listId);
    if (t) out.searchParams.set('t', t);
    return {
      url: out.href,
      kind: 'video',
      id: videoId,
      list: listId,
      key: `video:${videoId}:${listId ?? ''}`,
    };
  }

  if (listId) {
    return {
      url: `${origin}/playlist?list=${listId}`,
      kind: 'playlist',
      id: listId,
      list: listId,
      key: `playlist:${listId}`,
    };
  }

  return null;
}

/**
 * Normalize any http(s) URL for sending: YouTube links are cleaned up,
 * other sites (MeTube supports everything yt-dlp does) pass through as-is.
 * @param {string} input
 * @returns {string|null} null when the URL is not http(s).
 */
export function normalizeUrl(input) {
  const yt = parseYouTubeUrl(input);
  if (yt) return yt.url;
  try {
    const u = new URL(String(input).trim());
    if (u.protocol === 'https:' || u.protocol === 'http:') return u.href;
  } catch {
    // Not a URL.
  }
  return null;
}

const TEXT_URL_RE =
  /(?:https?:\/\/)?(?:(?:www|m|music)\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\/[^\s<>"'`]+/gi;

/**
 * Find YouTube links written as plain text (e.g. in a selection).
 * @param {string} text
 * @returns {YouTubeLink[]}
 */
export function findYouTubeUrlsInText(text) {
  const found = [];
  for (const match of String(text ?? '').matchAll(TEXT_URL_RE)) {
    let raw = match[0].replace(/[)\].,;:!?}>]+$/, '');
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
    const link = parseYouTubeUrl(raw);
    if (link) found.push(link);
  }
  return found;
}

/**
 * Remove duplicates (same video/playlist), keeping the first occurrence.
 * @template {YouTubeLink} T
 * @param {T[]} links
 * @returns {T[]}
 */
export function dedupeLinks(links) {
  const seen = new Set();
  return links.filter((link) => {
    if (seen.has(link.key)) return false;
    seen.add(link.key);
    return true;
  });
}
