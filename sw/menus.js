// Right-click menus, built from the settings (see lib/menu.js): the MeTube
// entry on pages, links, selections and the video player, and the extension
// icon's own menu.

import { loadSettings, parseSubtitleLangs } from '../lib/config.js';
import { t } from '../lib/i18n.js';
import { buildMenuItems, menuDownloads, parseMenuItemId } from '../lib/menu.js';
import { dedupeLinks, findYouTubeUrlsInText, normalizeUrl, parseYouTubeUrl } from '../lib/youtube.js';
import { reportNothing } from './feedback.js';
import { toggleOverlay } from './overlay.js';
import { sendDownloads } from './send.js';

async function playerShortcut() {
  const commands = (await chrome.commands?.getAll()) ?? [];
  return commands.find((command) => command.name === 'toggle-overlay')?.shortcut ?? '';
}

async function rebuild() {
  const settings = await loadSettings();
  const items = buildMenuItems(settings.menu, {
    langs: parseSubtitleLangs(settings.subtitleLangs).langs,
    shortcut: await playerShortcut(),
  });
  await chrome.contextMenus.removeAll();
  for (const item of items) {
    chrome.contextMenus.create(item, () => {
      if (chrome.runtime.lastError) console.warn(`Menu item ${item.id}:`, chrome.runtime.lastError.message);
    });
  }
}

let rebuilding = Promise.resolve();

/** (Re)create every item from the saved settings; calls run one after another. */
export function createMenus() {
  rebuilding = rebuilding.then(rebuild, rebuild);
  return rebuilding;
}

export function onMenuClicked(info, tab) {
  handleMenuClick(info, tab).catch((err) => console.error(err));
}

export async function handleMenuClick(info, tab) {
  const entry = parseMenuItemId(info.menuItemId);
  if (entry.action === 'settings') return chrome.runtime.openOptionsPage();
  if (entry.action === 'open') return openMeTube();
  if (entry.action === 'play') return toggleOverlay(tab);

  const settings = await loadSettings();
  const download = menuDownloads(entry, settings.menu, parseSubtitleLangs(settings.subtitleLangs).langs);
  if (!download) return;

  // The extension icon's menu acts on the current tab.
  const urls = (entry.toolbar ? [normalizeUrl(tab?.url)] : await targetUrls(info, tab)).filter(Boolean);
  if (!urls.length) {
    await reportNothing(!entry.toolbar && info.selectionText ? t('errNoLinksInSelection') : t('errNotDownloadable'));
    return;
  }
  const results = await sendDownloads(urls, () => download.downloads, { label: download.label });
  if (results.some((r) => r.code === 'config')) chrome.runtime.openOptionsPage();
}

async function openMeTube() {
  const { baseUrl } = await loadSettings();
  if (baseUrl) chrome.tabs.create({ url: `${baseUrl}/` });
  else chrome.runtime.openOptionsPage();
}

/** What a right-click is about: the links in a selection, a link, or the page. */
async function targetUrls(info, tab) {
  if (info.selectionText) return collectSelectionUrls(info, tab);
  if (info.linkUrl) return [normalizeUrl(info.linkUrl)];
  // Inside a YouTube player embedded in another site: that video, not the page.
  if (info.frameUrl && parseYouTubeUrl(info.frameUrl)) return [normalizeUrl(info.frameUrl)];
  return [normalizeUrl(info.pageUrl || tab?.url)];
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
