// Settings, defaults and the download option catalog shared by every
// extension page and the service worker.

import { t } from './i18n.js';
import { MENU_DEFAULTS, normalizeMenu } from './menu.js';

export const DEFAULTS = Object.freeze({
  baseUrl: '',
  username: '',
  password: '',
  downloadType: 'video',
  quality: 'best',
  format: 'any',
  folder: '',
  // Comma-separated yt-dlp language codes the overlay player looks for.
  subtitleLangs: 'fr,en',
  // Offer to delete the file from MeTube when a video ends in the player.
  endScreen: true,
  // Right-click menus: see lib/menu.js.
  menu: MENU_DEFAULTS,
});

// MeTube's own rule for subtitle languages.
const LANG_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,34}$/;

/**
 * Parse "fr, en,pt-BR" into ["fr", "en", "pt-BR"] (valid, unique, in order).
 * @returns {{langs: string[], invalid: string[]}}
 */
export function parseSubtitleLangs(text) {
  const langs = [];
  const invalid = [];
  for (const part of String(text ?? '').split(/[\s,;]+/)) {
    if (!part) continue;
    if (!LANG_RE.test(part)) invalid.push(part);
    else if (!langs.includes(part)) langs.push(part);
  }
  return { langs, invalid };
}

// Used by the popup's "Audio only (m4a)" toggle.
export const AUDIO_PRESET = Object.freeze({
  downloadType: 'audio',
  format: 'm4a',
  quality: 'best',
});

const VIDEO_QUALITIES = ['best', '2160', '1440', '1080', '720', '480', '360', '240', 'worst'];

// Mirrors the combinations MeTube's /add endpoint accepts: type → format → qualities.
export const CATALOG = {
  video: { any: VIDEO_QUALITIES, mp4: VIDEO_QUALITIES },
  audio: {
    m4a: ['best', '192', '128'],
    mp3: ['best', '320', '192', '128'],
    opus: ['best'],
    flac: ['best'],
    wav: ['best'],
  },
};

export function typeLabel(type) {
  return type === 'audio' ? t('audio') : t('video');
}

export function formatLabel(format) {
  return format === 'any' ? t('formatAny') : format === 'opus' ? 'Opus' : format.toUpperCase();
}

/** "best" → "Best", "2160" → "2160p (4K)", "320" (audio) → "320 kbps". */
export function qualityLabel(type, quality) {
  if (quality === 'best') return t('qualityBest');
  if (quality === 'worst') return t('qualityWorst');
  if (type === 'audio') return t('kbps', quality);
  return quality === '2160' ? t('quality4k', quality) : `${quality}p`;
}

/**
 * Coerce a type/format/quality triple to a combination MeTube accepts.
 * @returns {{downloadType: string, format: string, quality: string}}
 */
export function coerceOptions({ downloadType, format, quality }) {
  const type = CATALOG[downloadType] ? downloadType : DEFAULTS.downloadType;
  const formats = CATALOG[type];
  const fmt = formats[format] ? format : Object.keys(formats)[0];
  const q = formats[fmt].includes(quality) ? quality : 'best';
  return { downloadType: type, format: fmt, quality: q };
}

/** Human-readable summary, e.g. "Video · MP4 · 1080p". */
export function describeOptions({ downloadType, format, quality, folder }) {
  const parts = [typeLabel(downloadType), formatLabel(format), qualityLabel(downloadType, quality)];
  if (folder) parts.push(`→ ${folder}`);
  return parts.join(' · ');
}

/** @returns {Promise<typeof DEFAULTS>} */
export async function loadSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULTS, ...settings, menu: normalizeMenu(settings?.menu) };
}

export function saveSettings(settings) {
  return chrome.storage.local.set({ settings });
}

/**
 * Validate the MeTube base URL typed by the user.
 * Accepts "metube.example.com" (assumes https) and keeps any path prefix
 * (MeTube's URL_PREFIX), without the trailing slash.
 * @returns {{baseUrl: string, origin: string, originPattern: string}}
 * @throws {Error} with a user-facing message.
 */
export function parseBaseUrl(raw) {
  let text = String(raw ?? '').trim();
  if (!text) throw new Error(t('errUrlMissing'));
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `https://${text}`;
  let u;
  try {
    u = new URL(text);
  } catch {
    throw new Error(t('errUrlInvalid', raw));
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw new Error(t('errUrlScheme'));
  }
  if (u.username || u.password) {
    throw new Error(t('errUrlCredentials'));
  }
  u.search = '';
  u.hash = '';
  return {
    baseUrl: u.href.replace(/\/+$/, ''),
    origin: u.origin,
    // Match patterns without a port match every port on that host.
    originPattern: `${u.protocol}//${u.hostname}/*`,
  };
}

/** Download options from settings, optionally replaced by the audio preset. */
export function downloadOptions(settings, { audio = false } = {}) {
  const base = audio ? AUDIO_PRESET : settings;
  return { ...coerceOptions(base), folder: String(settings.folder ?? '').trim() };
}
