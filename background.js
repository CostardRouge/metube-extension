// Service worker: context menus, message handling and every call to MeTube.

import { downloadOptions, loadSettings, parseBaseUrl } from './lib/config.js';
import { MeTubeError, addDownload, getVersion } from './lib/metube.js';
import { dedupeLinks, findYouTubeUrlsInText, normalizeUrl, parseYouTubeUrl } from './lib/youtube.js';

const CONCURRENCY = 3;
const NOTIFICATION_ID = 'metube-result';
const BADGE_COLORS = { busy: '#5b6170', ok: '#1f9d55', error: '#d93025', warn: '#c77700' };
const ALL_CONTEXTS = ['link', 'selection', 'page'];

// ---------------------------------------------------------------------------
// Context menus

const MENU_ITEMS = [
  { id: 'root', title: 'MeTube', contexts: ALL_CONTEXTS },
  { id: 'send-link', parentId: 'root', title: 'Send to MeTube', contexts: ['link'] },
  { id: 'send-selection', parentId: 'root', title: 'Send YouTube links in selection', contexts: ['selection'] },
  { id: 'send-page', parentId: 'root', title: 'Send this page to MeTube', contexts: ['page'] },
  { id: 'separator', parentId: 'root', type: 'separator', contexts: ALL_CONTEXTS },
  { id: 'audio', parentId: 'root', title: 'Audio only (m4a)', contexts: ALL_CONTEXTS },
  { id: 'audio-link', parentId: 'audio', title: 'Send link', contexts: ['link'] },
  { id: 'audio-selection', parentId: 'audio', title: 'Send YouTube links in selection', contexts: ['selection'] },
  { id: 'audio-page', parentId: 'audio', title: 'Send this page', contexts: ['page'] },
];

async function createMenus() {
  await chrome.contextMenus.removeAll();
  for (const item of MENU_ITEMS) {
    chrome.contextMenus.create(item, () => void chrome.runtime.lastError);
  }
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  createMenus();
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) chrome.runtime.openOptionsPage();
});
chrome.runtime.onStartup.addListener(createMenus);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const [group, action] = String(info.menuItemId).split('-');
  if (!action) return;
  handleMenuClick(action, info, tab, group === 'audio').catch((err) => console.error(err));
});

async function handleMenuClick(action, info, tab, audio) {
  let urls = [];
  if (action === 'link') urls = [normalizeUrl(info.linkUrl)];
  if (action === 'page') urls = [normalizeUrl(info.pageUrl || tab?.url)];
  if (action === 'selection') urls = await collectSelectionUrls(info, tab);
  urls = urls.filter(Boolean);

  if (!urls.length) {
    await reportNothing(
      action === 'selection'
        ? 'No YouTube links found in the selection.'
        : 'This is not an http(s) URL MeTube can download.',
    );
    return;
  }
  const results = await sendUrls(urls, { audio });
  if (results.some((r) => r.code === 'config')) chrome.runtime.openOptionsPage();
}

// Injected into the page: returns the hrefs of <a> elements intersecting the
// current selection (plus the one enclosing it) and the selected text.
function readSelectionLinks() {
  const selection = window.getSelection();
  const hrefs = new Set();
  if (selection) {
    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i);
      const node = range.commonAncestorContainer;
      const root = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      if (!root) continue;
      const enclosing = root.closest('a[href]');
      if (enclosing) hrefs.add(enclosing.href);
      for (const a of root.querySelectorAll('a[href]')) {
        if (range.intersectsNode(a)) hrefs.add(a.href);
      }
    }
  }
  return {
    // SVG <a> elements expose href as an object: keep strings only.
    hrefs: [...hrefs].filter((href) => typeof href === 'string'),
    text: selection ? selection.toString() : '',
  };
}

async function collectSelectionUrls(info, tab) {
  const links = [];
  if (tab?.id >= 0) {
    try {
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [info.frameId ?? 0] },
        func: readSelectionLinks,
      });
      const { hrefs = [], text = '' } = injection?.result ?? {};
      for (const href of hrefs) {
        const link = parseYouTubeUrl(href);
        if (link) links.push(link);
      }
      links.push(...findYouTubeUrlsInText(text));
    } catch (err) {
      // Restricted page (Web Store, PDF viewer, other extension…): fall back
      // to the plain selected text Chrome hands us.
      console.warn('Could not read the selection from the page:', err);
    }
  }
  links.push(...findYouTubeUrlsInText(info.selectionText));
  return dedupeLinks(links).map((link) => link.url);
}

// ---------------------------------------------------------------------------
// Sending

async function readyToSend() {
  const settings = await loadSettings();
  if (!settings.baseUrl) {
    throw new MeTubeError('config', 'MeTube is not configured yet: set its URL in the extension options.');
  }
  const { origin, originPattern } = parseBaseUrl(settings.baseUrl);
  if (!(await chrome.permissions.contains({ origins: [originPattern] }))) {
    throw new MeTubeError(
      'permission',
      `The extension is not allowed to access ${origin}. Open the options and click Save to grant it.`,
    );
  }
  return settings;
}

function failure(url, err) {
  return { url, ok: false, error: err?.message ?? String(err), code: err?.code ?? 'unknown' };
}

/**
 * Send URLs to MeTube, then report through the badge and a notification.
 * @param {string[]} urls  Already normalized.
 * @returns {Promise<{url: string, ok: boolean, error?: string, code?: string}[]>}
 */
async function sendUrls(urls, { audio = false } = {}) {
  setBadge('…', BADGE_COLORS.busy);

  let settings;
  try {
    settings = await readyToSend();
  } catch (err) {
    const results = urls.map((url) => failure(url, err));
    await report(results, { audio });
    return results;
  }

  const options = downloadOptions(settings, { audio });
  const results = new Array(urls.length);
  let fatal = null;
  let next = 0;

  // Small worker pool; once an error is known to affect every request
  // (bad credentials, host down…) the remaining URLs are not attempted.
  async function worker() {
    while (next < urls.length) {
      const index = next++;
      const url = urls[index];
      if (fatal) {
        results[index] = failure(url, fatal);
        continue;
      }
      try {
        await addDownload(settings, url, options);
        results[index] = { url, ok: true };
      } catch (err) {
        if (err instanceof MeTubeError && err.fatal) fatal = err;
        results[index] = failure(url, err);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));

  await report(results, { audio });
  return results;
}

// ---------------------------------------------------------------------------
// Feedback: badge + notification (+ last result for the popup)

let badgeTimer;

function setBadge(text, color, clearAfterMs) {
  clearTimeout(badgeTimer);
  const ignore = () => {};
  chrome.action.setBadgeBackgroundColor({ color }).catch(ignore);
  chrome.action.setBadgeTextColor?.({ color: '#ffffff' })?.catch(ignore);
  chrome.action.setBadgeText({ text }).catch(ignore);
  if (clearAfterMs) {
    badgeTimer = setTimeout(() => chrome.action.setBadgeText({ text: '' }).catch(ignore), clearAfterMs);
  }
}

function notify(title, message) {
  // Arc (and some OS setups) silently drop notifications: the badge and the
  // popup remain the primary feedback, so failures here are ignored.
  try {
    chrome.notifications?.create(
      NOTIFICATION_ID,
      { type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon-128.png'), title, message },
      () => void chrome.runtime.lastError,
    );
  } catch {
    // Notifications unavailable.
  }
}

async function report(results, { audio }) {
  const sent = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const suffix = audio ? ' (audio)' : '';

  await chrome.storage.session.set({
    lastResult: {
      at: Date.now(),
      audio,
      total: results.length,
      sent: sent.length,
      failed: failed.map(({ url, error }) => ({ url, error })),
    },
  });

  if (!failed.length) {
    setBadge(String(sent.length), BADGE_COLORS.ok, 8000);
    notify(`Sent to MeTube${suffix}`, sent.length === 1 ? sent[0].url : `${sent.length} links queued for download.`);
    return;
  }

  // The red "!" stays until the popup is opened (it shows the details).
  setBadge('!', BADGE_COLORS.error);
  notify(
    sent.length ? `MeTube: ${failed.length} of ${results.length} failed${suffix}` : `MeTube: not sent${suffix}`,
    failed[0].error,
  );
}

async function reportNothing(message) {
  await chrome.storage.session.set({ lastResult: { at: Date.now(), total: 0, sent: 0, failed: [], message } });
  setBadge('0', BADGE_COLORS.warn, 8000);
  notify('MeTube', message);
}

chrome.notifications?.onClicked?.addListener(async (id) => {
  if (id !== NOTIFICATION_ID) return;
  chrome.notifications.clear(id);
  const [{ lastResult }, settings] = await Promise.all([chrome.storage.session.get('lastResult'), loadSettings()]);
  if (lastResult?.failed?.length || !settings.baseUrl) chrome.runtime.openOptionsPage();
  else chrome.tabs.create({ url: `${settings.baseUrl}/` });
});

// ---------------------------------------------------------------------------
// Messages from the popup and the options page

const HANDLERS = {
  async send({ urls, audio }) {
    const clean = [...new Set((Array.isArray(urls) ? urls : []).map(normalizeUrl).filter(Boolean))];
    if (!clean.length) {
      await reportNothing('Nothing to send.');
      return { results: [] };
    }
    return { results: await sendUrls(clean, { audio: Boolean(audio) }) };
  },

  // Uses the values currently in the options form, saved or not.
  async test({ settings }) {
    const { baseUrl, origin, originPattern } = parseBaseUrl(settings?.baseUrl);
    if (!(await chrome.permissions.contains({ origins: [originPattern] }))) {
      throw new MeTubeError('permission', `The extension is not allowed to access ${origin}.`);
    }
    const info = await getVersion({
      baseUrl,
      username: String(settings.username ?? ''),
      password: String(settings.password ?? ''),
    });
    return { ok: true, version: info?.version ?? null, ytdlp: info?.['yt-dlp'] ?? null };
  },
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only this extension's own pages may trigger requests.
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) return false;
  const handler = HANDLERS[message?.type];
  if (!handler) return false;
  handler(message).then(sendResponse, (err) =>
    sendResponse({ ok: false, error: err?.message ?? String(err), code: err?.code }),
  );
  return true;
});
