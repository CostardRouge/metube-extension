// Finding a YouTube video in MeTube's /history response and deciding what the
// overlay player shows. Pure functions, shared by the service worker and tests.

import { formatNumber, formatPercent, t } from './i18n.js';
import { parseYouTubeUrl } from './youtube.js';

const AUDIO_FORMATS = new Set(['m4a', 'mp3', 'opus', 'wav', 'flac', 'aac', 'ogg']);
// Caption-only and thumbnail-only downloads can't be played.
const UNPLAYABLE_TYPES = new Set(['captions', 'thumbnail']);

const RANK = { finished: 0, active: 1, pending: 2, error: 3 };

/**
 * /history buckets are lists of items; older MeTube versions sent [key, item]
 * pairs or objects keyed by URL. Accept all three.
 */
function toItems(bucket) {
  const entries = Array.isArray(bucket) ? bucket : bucket && typeof bucket === 'object' ? Object.values(bucket) : [];
  return entries
    .map((entry) => (Array.isArray(entry) && entry.length === 2 ? entry[1] : entry))
    .filter((item) => item && typeof item === 'object');
}

/** Video ID of a history item, from its URL (whatever form it was sent in). */
export function itemVideoId(item) {
  const link = parseYouTubeUrl(item?.url);
  return link && link.kind !== 'playlist' ? link.id : null;
}

function matchesVideo(item, videoId) {
  if (itemVideoId(item) === videoId) return true;
  // yt-dlp's ID, possibly behind MeTube's custom name prefix ("prefix.ID").
  const id = String(item?.id ?? '');
  return id === videoId || id.endsWith(`.${videoId}`);
}

export function isAudioItem(item) {
  if (item.download_type) return item.download_type === 'audio';
  // Before download_type existed, audio was quality "audio" or an audio format.
  return item.quality === 'audio' || AUDIO_FORMATS.has(String(item.format ?? '').toLowerCase());
}

function stateOf(item, bucket) {
  const status = String(item.status ?? '');
  if (status === 'error') return 'error';
  if (status === 'finished' || bucket === 'done') return item.filename ? 'finished' : 'error';
  // "pending" = added with auto_start off: waits for Start in MeTube's UI.
  if (bucket === 'pending' || status === 'pending') return 'pending';
  return 'active';
}

/**
 * @typedef {object} Lookup
 * @property {'absent'|'finished'|'active'|'pending'|'error'} state
 * @property {object} [item]  The matching history item.
 */

/**
 * Pick the most useful history entry for a video: a finished video beats a
 * finished audio-only file, then in-progress, waiting and failed entries;
 * the newest wins a tie.
 *
 * `preferActive` puts in-progress entries first. The overlay sets it once it
 * has (re-)added the video itself: MeTube keeps the previous entry (say, a
 * finished download whose file was deleted) until the new one finishes.
 * @param {{queue?: any, pending?: any, done?: any}} history
 * @param {string} videoId
 * @param {{preferActive?: boolean}} [options]
 * @returns {Lookup}
 */
export function findDownload(history, videoId, { preferActive = false } = {}) {
  const candidates = [];
  for (const bucket of ['queue', 'pending', 'done']) {
    for (const item of toItems(history?.[bucket])) {
      if (UNPLAYABLE_TYPES.has(item.download_type) || !matchesVideo(item, videoId)) continue;
      const state = stateOf(item, bucket);
      let rank = RANK[state] + (state === 'finished' && isAudioItem(item) ? 0.5 : 0);
      if (preferActive && (state === 'active' || state === 'pending')) rank -= RANK.error + 1;
      candidates.push({ state, item, rank, timestamp: Number(item.timestamp) || 0 });
    }
  }
  if (!candidates.length) return { state: 'absent' };
  candidates.sort((a, b) => a.rank - b.rank || b.timestamp - a.timestamp);
  const { state, item } = candidates[0];
  return { state, item };
}

function pathSegments(path) {
  return String(path ?? '')
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..');
}

/** Directory + file path of a finished item, each segment URL-encoded. */
function filePath(item, filename) {
  // Same rule as MeTube's UI: audio downloads live under audio_download/.
  const root = isAudioItem(item) ? 'audio_download' : 'download';
  return [root, ...pathSegments(item.folder), ...pathSegments(filename)].map(encodeURIComponent).join('/');
}

/** URL of a finished item's file: {base}/download/{folder/}{filename}. */
export function fileUrl(baseUrl, item) {
  return `${baseUrl}/${filePath(item, item.filename)}`;
}

/**
 * Where yt-dlp writes subtitles: "<file without extension>.<lang>.vtt",
 * next to the media file.
 * @returns {{lang: string, url: string}[]}
 */
export function subtitleUrls(baseUrl, item, langs) {
  const stem = String(item.filename ?? '').replace(/\.[^./]+$/, '');
  if (!stem) return [];
  return langs.map((lang) => ({ lang, url: `${baseUrl}/${filePath(item, `${stem}.${lang}.vtt`)}` }));
}

function formatEta(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

// 1234 → "1.2 KB": decimal units, like file managers; 1 decimal below 10.
function withUnit(value, units) {
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  return t('numberWithUnit', formatNumber(value, value < 10 && unit ? 1 : 0), units[unit]);
}

/** 1234567890 → "1.2 GB" (English) or "1,2 Go" (French). */
export function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  return withUnit(bytes, t('sizeUnits').split(' '));
}

function formatSpeed(bytesPerSecond) {
  return withUnit(bytesPerSecond, t('speedUnits').split(' '));
}

/**
 * Progress line for an unfinished item.
 * @returns {{text: string, percent: number|null}}
 */
export function describeProgress(item) {
  const status = String(item?.status ?? '');
  const percent = Number.isFinite(item?.percent) ? Math.min(100, Math.max(0, item.percent)) : null;
  switch (status) {
    case 'downloading': {
      const parts = [
        percent === null
          ? t('progressDownloading')
          : t('progressDownloadingPercent', formatPercent(Math.floor(percent))),
      ];
      if (item.speed > 0) parts.push(formatSpeed(item.speed));
      if (Number.isFinite(item.eta)) parts.push(t('progressLeft', formatEta(item.eta)));
      return { text: parts.join(' · '), percent };
    }
    case 'postprocessing':
      return { text: t('progressProcessing'), percent: 100 };
    case 'preparing':
      return { text: t('progressPreparing'), percent: null };
    case 'queued':
      return { text: t('progressQueued'), percent: null };
    case 'scheduled':
      return { text: t('progressScheduled'), percent: null };
    case 'pending':
      return { text: t('progressPending'), percent: null };
    default:
      return { text: status ? status[0].toUpperCase() + status.slice(1) : t('progressStarting'), percent };
  }
}
