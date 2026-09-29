// Right-click menus: send a link, the YouTube links in a selection, or the page.

import { dedupeLinks, findYouTubeUrlsInText, normalizeUrl, parseYouTubeUrl } from '../lib/youtube.js';
import { reportNothing } from './feedback.js';
import { sendUrls } from './send.js';

const ALL_CONTEXTS = ['link', 'selection', 'page'];

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

export async function createMenus() {
  await chrome.contextMenus.removeAll();
  for (const item of MENU_ITEMS) {
    chrome.contextMenus.create(item, () => void chrome.runtime.lastError);
  }
}

export function onMenuClicked(info, tab) {
  const [group, action] = String(info.menuItemId).split('-');
  if (!action) return;
  handleMenuClick(action, info, tab, group === 'audio').catch((err) => console.error(err));
}

export async function handleMenuClick(action, info, tab, audio) {
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
