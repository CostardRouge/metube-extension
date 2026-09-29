// Settings, defaults and the download option catalog shared by every
// extension page and the service worker.

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
});

const LANG_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,34}$/;

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

// Used by the "Audio only (m4a)" context submenu and the popup toggle.
export const AUDIO_PRESET = Object.freeze({
  downloadType: 'audio',
  format: 'm4a',
  quality: 'best',
});

const VIDEO_QUALITIES = [
  ['best', 'Best'],
  ['2160', '2160p (4K)'],
  ['1440', '1440p'],
  ['1080', '1080p'],
  ['720', '720p'],
  ['480', '480p'],
  ['360', '360p'],
  ['240', '240p'],
  ['worst', 'Worst'],
];

// Mirrors the combinations MeTube's /add endpoint accepts.
export const CATALOG = {
  video: {
    label: 'Video',
    formats: {
      any: { label: 'Any', qualities: VIDEO_QUALITIES },
      mp4: { label: 'MP4', qualities: VIDEO_QUALITIES },
    },
  },
  audio: {
    label: 'Audio',
    formats: {
      m4a: {
        label: 'M4A',
        qualities: [
          ['best', 'Best'],
          ['192', '192 kbps'],
          ['128', '128 kbps'],
        ],
      },
      mp3: {
        label: 'MP3',
        qualities: [
          ['best', 'Best'],
          ['320', '320 kbps'],
          ['192', '192 kbps'],
          ['128', '128 kbps'],
        ],
      },
      opus: { label: 'Opus', qualities: [['best', 'Best']] },
    },
  },
};

/**
 * Coerce a type/format/quality triple to a combination MeTube accepts.
 * @returns {{downloadType: string, format: string, quality: string}}
 */
export function coerceOptions({ downloadType, format, quality }) {
  const type = CATALOG[downloadType] ? downloadType : DEFAULTS.downloadType;
  const formats = CATALOG[type].formats;
  const fmt = formats[format] ? format : Object.keys(formats)[0];
  const qualities = formats[fmt].qualities.map(([value]) => value);
  const q = qualities.includes(quality) ? quality : 'best';
  return { downloadType: type, format: fmt, quality: q };
}

/** Human-readable summary, e.g. "Video · MP4 · 1080p". */
export function describeOptions({ downloadType, format, quality, folder }) {
  const type = CATALOG[downloadType];
  const fmt = type?.formats[format];
  const q = fmt?.qualities.find(([value]) => value === quality);
  const parts = [type?.label ?? downloadType, fmt?.label ?? format, q?.[1] ?? quality];
  if (folder) parts.push(`→ ${folder}`);
  return parts.join(' · ');
}

/** @returns {Promise<typeof DEFAULTS>} */
export async function loadSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULTS, ...settings };
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
  if (!text) throw new Error('Enter the URL of your MeTube instance.');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `https://${text}`;
  let u;
  try {
    u = new URL(text);
  } catch {
    throw new Error(`"${raw}" is not a valid URL.`);
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw new Error('The MeTube URL must start with http:// or https://.');
  }
  if (u.username || u.password) {
    throw new Error('Put the credentials in the username/password fields, not in the URL.');
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
