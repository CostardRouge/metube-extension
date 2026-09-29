// The overlay player on YouTube watch pages: opening it, and answering the
// overlay page's requests. Every MeTube call stays in the service worker.

import { downloadOptions, parseSubtitleLangs } from '../lib/config.js';
import { fileUrl, findDownload, subtitleUrls } from '../lib/history.js';
import { t } from '../lib/i18n.js';
import { MeTubeError, addDownload, deleteDownload, fetchText, getHistory, probeFile } from '../lib/metube.js';
import { watchVideoId } from '../lib/youtube.js';
import { BADGE_COLORS, notify, setBadge } from './feedback.js';
import { requireSettings } from './settings.js';

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * Open or close the overlay in a tab. The injected script toggles on every
 * run and keeps its state in the page's isolated world between runs.
 */
export async function toggleOverlay(tab) {
  if (!tab?.id || !watchVideoId(tab.url)) {
    const error = t('errOpenVideo');
    setBadge('!', BADGE_COLORS.warn, 5000);
    notify(t('playerName'), error);
    return { ok: false, error };
  }
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/overlay-host.js'] });
  return { ok: true };
}

export async function onCommand(command, tab) {
  if (command !== 'toggle-overlay') return;
  const target = tab ?? (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];
  await toggleOverlay(target).catch((err) => console.error(err));
}

function checkVideoId(videoId) {
  if (!VIDEO_ID_RE.test(String(videoId))) throw new Error(t('errInvalidVideoId'));
}

// The overlay page may only make the service worker fetch files on MeTube.
function checkMeTubeUrl(settings, url) {
  if (typeof url !== 'string' || !url.startsWith(`${settings.baseUrl}/`)) {
    throw new Error(t('errOutsideMeTube'));
  }
}

// What the overlay needs from a history item.
function publicItem(item) {
  const {
    title,
    status,
    percent,
    speed,
    eta,
    msg,
    error,
    download_type: downloadType,
    filename,
    quality,
    format,
    size,
  } = item;
  return { title, status, percent, speed, eta, msg, error, downloadType, filename, quality, format, size };
}

export const OVERLAY_HANDLERS = {
  // From the popup's Play button.
  async 'overlay:toggle'({ tabId }) {
    return toggleOverlay(await chrome.tabs.get(tabId));
  },

  /** Where the video stands in MeTube, with file and subtitle URLs once finished. */
  async 'overlay:lookup'({ videoId, preferActive }) {
    checkVideoId(videoId);
    const settings = await requireSettings();
    const found = findDownload(await getHistory(settings), videoId, { preferActive: Boolean(preferActive) });
    const result = { ok: true, state: found.state };
    if (found.item) result.item = publicItem(found.item);
    if (found.state === 'finished') {
      result.fileUrl = fileUrl(settings.baseUrl, found.item);
      result.subtitles = subtitleUrls(settings.baseUrl, found.item, parseSubtitleLangs(settings.subtitleLangs).langs);
    }
    return result;
  },

  /** Queue the video with the default options. Only the ID is sent: no t/list. */
  async 'overlay:add'({ videoId }) {
    checkVideoId(videoId);
    const settings = await requireSettings();
    await addDownload(settings, `https://www.youtube.com/watch?v=${videoId}`, downloadOptions(settings));
    return { ok: true };
  },

  /** Surface 401/404 before <video> tries the file and fails silently. */
  async 'overlay:probe'({ url }) {
    const settings = await requireSettings();
    checkMeTubeUrl(settings, url);
    await probeFile(settings, url);
    return { ok: true };
  },

  /** Subtitle files that exist; missing languages are skipped. */
  async 'overlay:subtitles'({ tracks }) {
    const settings = await requireSettings();
    const wanted = (Array.isArray(tracks) ? tracks : []).filter(({ url }) => {
      checkMeTubeUrl(settings, url);
      return url.endsWith('.vtt');
    });
    const texts = await Promise.all(wanted.map(({ url }) => fetchText(settings, url)));
    return {
      ok: true,
      // A proxy may answer 200 with an HTML page: keep real WebVTT only.
      tracks: wanted
        .map(({ lang }, i) => ({ lang, text: texts[i] }))
        .filter(({ text }) => text && /^\uFEFF?WEBVTT/.test(text)),
    };
  },

  /**
   * Delete the video from MeTube: its entry, and its files if the server
   * allows it. Then check whether the file is really gone: MeTube keeps files
   * unless it runs with DELETE_FILE_ON_TRASHCAN=ask (or true).
   * The entry is looked up again here: the page only names the video.
   */
  async 'overlay:delete'({ videoId }) {
    checkVideoId(videoId);
    const settings = await requireSettings();
    const found = findDownload(await getHistory(settings), videoId);
    if (found.state !== 'finished' && found.state !== 'error') {
      throw new MeTubeError('metube', t('errNotFinished'));
    }
    const file = found.state === 'finished' ? fileUrl(settings.baseUrl, found.item) : null;
    await deleteDownload(settings, found.item.url);

    // true: gone; false: still served; null: unknown (no file, or check failed).
    let fileRemoved = null;
    if (file) {
      try {
        await probeFile(settings, file);
        fileRemoved = false;
      } catch (err) {
        if (err.code === 'file_missing') fileRemoved = true;
      }
    }
    return { ok: true, fileRemoved, size: found.item.size ?? null };
  },
};
