// Overlay player page, shown in an iframe over a YouTube watch page.
// The video ID and start time come from this page's URL (set by
// content/overlay-host.js); every MeTube request goes through the service
// worker. The <video> gets its Authorization header from the
// declarativeNetRequest rule (sw/auth-rule.js).

import { describeProgress, formatSize } from '../lib/history.js';
import { loadSettings } from '../lib/config.js';

const POLL_MS = 2000;
// MeTube answers /add once the video is queued; allow some slack before
// deciding it never showed up in /history.
const MAX_ABSENT_POLLS_AFTER_ADD = 15;
const HOTKEYS = new Set([' ', 'k', 'm', 'f', 'c', 'j', 'l', 'ArrowLeft', 'ArrowRight']);

const $ = (id) => document.getElementById(id);
const els = {
  backdrop: $('backdrop'),
  title: $('title'),
  close: $('close'),
  openMetubeHead: $('open-metube-head'),
  status: $('status'),
  statusSpinner: $('status-spinner'),
  statusText: $('status-text'),
  statusDetail: $('status-detail'),
  progress: $('progress'),
  progressBar: $('progress-bar'),
  retry: $('retry'),
  openOptions: $('open-options'),
  openMetube: $('open-metube'),
  player: $('player'),
  video: $('video'),
  subtitleInfo: $('subtitle-info'),
  toast: $('toast'),
  delete: $('delete'),
  endScreen: $('end-screen'),
  endText: $('end-text'),
  endDelete: $('end-delete'),
  endReplay: $('end-replay'),
  endKeep: $('end-keep'),
  confirm: $('confirm'),
  confirmName: $('confirm-name'),
  confirmMeta: $('confirm-meta'),
  confirmCancel: $('confirm-cancel'),
};

const params = new URLSearchParams(location.search);
const videoId = params.get('v') ?? '';
const startAt = Number(params.get('t')) || 0;

let pollTimer = null;
let added = false;
let absentPolls = 0;
let retryAction = null;
// The finished download being played (the lookup result), if any.
let current = null;
const settingsReady = loadSettings();

/** Message the service worker; its errors come back as {ok: false, error, code}. */
async function sw(type, payload = {}) {
  let res;
  try {
    res = await chrome.runtime.sendMessage({ type, ...payload });
  } catch (err) {
    throw Object.assign(new Error(`The extension isn't responding (${err.message}). Reload the page.`), {
      code: 'internal',
    });
  }
  if (!res) throw Object.assign(new Error("The extension didn't answer. Reload the page."), { code: 'internal' });
  if (res.ok === false) throw Object.assign(new Error(res.error), { code: res.code });
  return res;
}

// ---------------------------------------------------------------------------
// Status panel

function setTitle(title) {
  const text = title || `YouTube video ${videoId}`;
  els.title.textContent = text;
  els.title.title = text;
  document.title = `${text} – MeTube`;
}

function showStatus(text, { detail = '', percent, busy = true } = {}) {
  els.status.hidden = false;
  els.status.classList.remove('error', 'ok', 'warn');
  els.endScreen.hidden = true;
  els.statusSpinner.hidden = !busy;
  els.statusText.textContent = text;
  els.statusDetail.textContent = detail;
  // percent: undefined = no bar, null = indeterminate, number = filled.
  els.progress.hidden = percent === undefined;
  els.progress.classList.toggle('indeterminate', percent === null);
  els.progressBar.style.width = typeof percent === 'number' ? `${percent}%` : '';
  els.retry.hidden = true;
  els.openOptions.hidden = true;
  els.openMetube.hidden = true;
}

const SETTINGS_CODES = new Set(['auth', 'config', 'permission', 'forbidden', 'not_found', 'bad_request']);

/**
 * @param {string} text
 * @param {{detail?: string, code?: string, retryLabel?: string, retry?: () => void}} options
 */
function showError(text, { detail = '', code, retryLabel = 'Retry', retry } = {}) {
  clearTimeout(pollTimer);
  showStatus(text, { detail, busy: false });
  els.status.classList.add('error');
  els.player.hidden = true;
  els.delete.hidden = true;
  retryAction = retry ?? null;
  els.retry.hidden = !retry;
  els.retry.textContent = retryLabel;
  els.openOptions.hidden = !SETTINGS_CODES.has(code);
  els.openMetube.hidden = !['metube', 'download', 'file_missing'].includes(code);
  (retry ? els.retry : els.close).focus();
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.hidden = false;
  setTimeout(() => {
    els.toast.hidden = true;
  }, 6000);
}

// ---------------------------------------------------------------------------
// Flow: look up → (add) → poll → play

function schedulePoll() {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(lookup, POLL_MS);
}

async function lookup() {
  let result;
  try {
    // Once we've (re-)added it, follow the new download, not an older entry.
    result = await sw('overlay:lookup', { videoId, preferActive: added });
  } catch (err) {
    showError(err.message, { code: err.code, retry: start });
    return;
  }
  if (result.item?.title) setTitle(result.item.title);

  switch (result.state) {
    case 'finished':
      await play(result);
      return;
    case 'active':
    case 'pending': {
      const { text, percent } = describeProgress(result.item);
      const detail = result.state === 'pending' ? 'It was added without auto-start: press Start in MeTube.' : '';
      showStatus(text, { percent, detail, busy: result.state === 'active' });
      if (result.state === 'pending') els.openMetube.hidden = false;
      schedulePoll();
      return;
    }
    case 'error': {
      const reason = result.item?.msg || result.item?.error || 'No reason given.';
      showError("MeTube couldn't download this video.", {
        detail: reason,
        code: 'download',
        retryLabel: 'Try again',
        retry: () => add(),
      });
      return;
    }
    case 'absent':
    default:
      if (!added) {
        await add();
      } else if (++absentPolls > MAX_ABSENT_POLLS_AFTER_ADD) {
        showError("MeTube accepted the video, but it doesn't appear in its queue.", {
          code: 'metube',
          retry: start,
        });
      } else {
        showStatus('Waiting for MeTube to queue the video…', { percent: null });
        schedulePoll();
      }
  }
}

async function add() {
  showStatus('Not in MeTube yet: sending it…', { percent: null });
  try {
    await sw('overlay:add', { videoId });
  } catch (err) {
    showError(err.message, { code: err.code, retry: () => add() });
    return;
  }
  added = true;
  absentPolls = 0;
  showStatus('Queued in MeTube', { percent: null });
  schedulePoll();
}

// On YouTube's HTTPS page, Chrome upgrades http:// media to https://
// (mixed content), which a plain-http server can't answer. Loopback
// addresses are exempt.
function blockedAsMixedContent(url) {
  const { protocol, hostname } = new URL(url);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(hostname) || hostname.endsWith('.localhost');
  return protocol === 'http:' && !loopback;
}

async function play(result) {
  if (blockedAsMixedContent(result.fileUrl)) {
    showError("The browser won't load http:// video inside an HTTPS page like YouTube.", {
      detail: 'Serve MeTube over HTTPS (for example with a certificate on Traefik) to use the player.',
      code: 'metube',
    });
    return;
  }
  showStatus('Opening the file…');
  try {
    await sw('overlay:probe', { url: result.fileUrl });
  } catch (err) {
    const missing = err.code === 'file_missing';
    showError(err.message, {
      code: err.code,
      retryLabel: missing ? 'Download again' : 'Retry',
      retry: missing ? () => add() : start,
    });
    return;
  }

  const { video, player } = els;
  if (startAt > 0) {
    video.addEventListener(
      'loadedmetadata',
      () => {
        if (!video.duration || startAt < video.duration - 1) video.currentTime = startAt;
      },
      { once: true },
    );
  }
  video.src = result.fileUrl;
  els.status.hidden = true;
  player.hidden = false;
  player.focus();
  current = result;
  els.delete.hidden = false;
  // Autoplay may be refused without a user gesture: the play button remains.
  video.play().catch(() => {});
  loadSubtitles(result.subtitles);
}

function languageName(lang) {
  try {
    return new Intl.DisplayNames([navigator.language, 'en'], { type: 'language' }).of(lang) ?? lang;
  } catch {
    return lang;
  }
}

async function loadSubtitles(candidates) {
  if (!candidates?.length) return;
  let tracks = [];
  try {
    ({ tracks } = await sw('overlay:subtitles', { tracks: candidates }));
  } catch (err) {
    console.warn('Subtitles unavailable:', err);
  }
  for (const { lang, text } of tracks) {
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.srclang = lang;
    track.label = languageName(lang);
    // Blob URLs: cross-origin <track> would need CORS, and can't carry auth.
    track.src = URL.createObjectURL(new Blob([text], { type: 'text/vtt' }));
    els.video.append(track);
  }
  els.subtitleInfo.textContent = tracks.length
    ? `Subtitles: ${tracks.map((t) => t.lang).join(', ')}`
    : 'No subtitles found';
}

els.video.addEventListener('error', () => {
  if (!els.video.getAttribute('src')) return;
  const code = els.video.error?.code;
  const text =
    code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || code === MediaError.MEDIA_ERR_DECODE
      ? "The browser can't play this file: its format or codec isn't supported."
      : 'The video stopped loading (network error).';
  showError(text, {
    detail: code === MediaError.MEDIA_ERR_NETWORK ? '' : 'Choosing MP4 as the default video format avoids this.',
    code: 'media',
    retry: start,
  });
});

// Stop streaming the file and drop its subtitles.
function resetPlayer() {
  current = null;
  els.delete.hidden = true;
  els.endScreen.hidden = true;
  els.player.hidden = true;
  els.video.removeAttribute('src');
  els.video.load();
  for (const track of els.video.querySelectorAll('track')) {
    URL.revokeObjectURL(track.src);
    track.remove();
  }
}

function start() {
  clearTimeout(pollTimer);
  resetPlayer();
  showStatus('Looking up this video in MeTube…');
  lookup();
}

// ---------------------------------------------------------------------------
// Deleting the video from MeTube (header button, Del key, end screen)

// "1080p · MP4 · 1.2 GB · subtitles fr, en"
function describeFile(item) {
  const audio = item.downloadType === 'audio';
  const quality = String(item.quality ?? '');
  const parts = [];
  if (quality === 'best') parts.push(audio ? 'Audio · best quality' : 'Best quality');
  else if (/^\d+$/.test(quality)) parts.push(audio ? `Audio · ${quality} kbps` : `${quality}p`);
  if (item.format && item.format !== 'any') parts.push(String(item.format).toUpperCase());
  const size = formatSize(item.size);
  if (size) parts.push(size);
  const subtitles = [...els.video.textTracks].map((track) => track.language).filter(Boolean);
  if (subtitles.length) parts.push(`subtitles ${subtitles.join(', ')}`);
  return parts.join(' · ');
}

function askDelete() {
  if (!current || els.confirm.open) return;
  els.video.pause();
  els.confirmName.textContent = current.item?.title || `YouTube video ${videoId}`;
  els.confirmMeta.textContent = describeFile(current.item ?? {});
  els.confirm.returnValue = '';
  els.confirm.showModal();
  // Focus on Cancel: Enter never deletes by accident. (No autofocus attribute:
  // Chrome blocks it in a cross-origin frame.)
  els.confirmCancel.focus();
}

async function deleteVideo() {
  if (!current) return;
  const size = formatSize(current.item?.size);
  resetPlayer();
  showStatus('Deleting from MeTube…');
  let res;
  try {
    res = await sw('overlay:delete', { videoId });
  } catch (err) {
    showError(err.message, { code: err.code, retry: start });
    return;
  }
  if (res.fileRemoved === false) {
    // MeTube removed its entry but kept the file (DELETE_FILE_ON_TRASHCAN).
    showStatus("Removed from MeTube's list, but the server kept the file.", {
      busy: false,
      detail: 'MeTube only erases files when it runs with DELETE_FILE_ON_TRASHCAN=ask (or true): see the README.',
    });
    els.status.classList.add('warn');
    retryAction = close;
    els.retry.textContent = 'Close';
    els.retry.hidden = false;
    els.retry.focus();
    return;
  }
  const freed = formatSize(res.size) || size;
  showStatus('Deleted from MeTube', {
    busy: false,
    detail: res.fileRemoved
      ? `File erased from the server${freed ? ` · ${freed} freed` : ''}.`
      : "Removed from MeTube's list.",
  });
  els.status.classList.add('ok');
  setTimeout(close, 2500);
}

els.delete.addEventListener('click', askDelete);
els.confirm.addEventListener('close', () => {
  if (els.confirm.returnValue === 'delete') deleteVideo();
  else els.player.focus();
});

// At the end, nothing is left to do but delete it, watch it again or keep it.
els.video.addEventListener('ended', async () => {
  if (!current || !(await settingsReady).endScreen) return;
  const size = formatSize(current.item?.size);
  els.endText.textContent = size ? `It takes ${size} on the server. Delete it now?` : 'Delete it from MeTube now?';
  els.endScreen.hidden = false;
  els.endKeep.focus();
});
els.video.addEventListener('play', () => {
  els.endScreen.hidden = true;
});
// The end screen's question is the confirmation.
els.endDelete.addEventListener('click', () => deleteVideo());
els.endReplay.addEventListener('click', () => {
  els.endScreen.hidden = true;
  els.video.currentTime = 0;
  els.video.play().catch(() => {});
  els.player.focus();
});
els.endKeep.addEventListener('click', () => close());

// ---------------------------------------------------------------------------
// Closing and keyboard

function close() {
  clearTimeout(pollTimer);
  els.video.pause();
  if (window.parent !== window) {
    // The host script checks this message comes from our origin and frame.
    window.parent.postMessage({ type: 'metube-overlay:close' }, location.ancestorOrigins?.[0] ?? '*');
  } else {
    window.close();
  }
}

function menuOpen() {
  return [...document.querySelectorAll('media-settings-menu, media-captions-menu, media-playback-rate-menu')].some(
    (menu) => !menu.hidden,
  );
}

document.addEventListener('keydown', (event) => {
  // The confirmation dialog handles its own keys (Esc cancels it).
  if (els.confirm.open) return;
  const modifier = event.ctrlKey || event.metaKey || event.altKey;
  if ((event.key === 'Delete' || event.key === 'Backspace') && current && !modifier) {
    event.preventDefault();
    askDelete();
    return;
  }
  if (event.key === 'Escape') {
    // First Esc closes an open player menu, the next one the overlay.
    if (menuOpen() || event.defaultPrevented) return;
    event.preventDefault();
    close();
    return;
  }
  // Media Chrome's shortcuts only fire with focus inside the player: forward
  // them from the rest of the page (header buttons, backdrop).
  // The end screen's buttons keep their own keys (Space, Enter).
  if (!els.player.hidden && els.endScreen.hidden && HOTKEYS.has(event.key) && !modifier) {
    if (!els.player.contains(event.target)) event.preventDefault();
  }
});

document.addEventListener('keyup', (event) => {
  if (els.confirm.open || !els.endScreen.hidden) return;
  if (els.player.hidden || !HOTKEYS.has(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;
  if (!els.player.contains(event.target)) els.player.keyboardShortcutHandler(event);
});

els.close.addEventListener('click', close);
els.backdrop.addEventListener('click', close);
els.retry.addEventListener('click', () => retryAction?.());
els.openOptions.addEventListener('click', () => chrome.runtime.openOptionsPage());

async function openMeTube() {
  const { baseUrl } = await loadSettings();
  if (baseUrl) chrome.tabs.create({ url: `${baseUrl}/` });
  else chrome.runtime.openOptionsPage();
}
els.openMetube.addEventListener('click', openMeTube);
els.openMetubeHead.addEventListener('click', openMeTube);

// ---------------------------------------------------------------------------

setTitle('');
if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
  showError('No YouTube video ID in the page address.', { code: 'internal' });
} else {
  if (params.has('novideo'))
    showToast("YouTube's player wasn't found on this page: playback starts from the beginning.");
  start();
}
