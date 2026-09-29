import { describeOptions, downloadOptions, loadSettings } from '../lib/config.js';
import { normalizeUrl, parseYouTubeUrl } from '../lib/youtube.js';

const $ = (id) => document.getElementById(id);
const els = {
  setup: $('setup'),
  setupBtn: $('setup-btn'),
  openOptions: $('open-options'),
  openMetube: $('open-metube'),
  notice: $('notice'),
  noticeText: $('notice-text'),
  noticeClose: $('notice-close'),
  pageTitle: $('page-title'),
  pageUrl: $('page-url'),
  sendPage: $('send-page'),
  count: $('count'),
  selectAll: $('select-all'),
  selectNone: $('select-none'),
  list: $('list'),
  empty: $('empty'),
  audioOnly: $('audio-only'),
  defaults: $('defaults'),
  sendSelected: $('send-selected'),
};

const state = {
  settings: null,
  tab: null,
  pageUrl: null,
  items: [],
  scanned: false,
  busy: false,
  lastClicked: -1,
};

// Injected into the active tab: lists candidate links with the best title
// the DOM offers. Parsing/normalizing happens back in the popup.
function scanPage() {
  const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const links = [];
  for (const a of document.querySelectorAll('a[href]')) {
    const href = a.href;
    if (typeof href !== 'string' || !/youtu\.?be/i.test(href)) continue;
    const titleAttr = clean(a.getAttribute('title'));
    const text = clean(a.textContent);
    const aria = clean(a.getAttribute('aria-label'));
    let title = '';
    let score = 0;
    if (titleAttr) {
      [title, score] = [titleAttr, 3];
    } else if (text && /\p{L}/u.test(text) && !a.querySelector('img')) {
      // Thumbnail links only contain a duration/badges: skip their text.
      [title, score] = [text, 2];
    } else if (aria) {
      [title, score] = [aria, 1];
    }
    links.push({ href, title: title.slice(0, 300), score });
  }
  for (const frame of document.querySelectorAll('iframe[src]')) {
    if (/youtube(?:-nocookie)?\.com\/embed\//i.test(frame.src)) {
      const title = clean(frame.title);
      links.push({ href: frame.src, title, score: title ? 2 : 0 });
    }
  }
  return { links };
}

function displayUrl(url) {
  try {
    const u = new URL(url);
    return `${u.host.replace(/^www\./, '')}${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

function cleanPageTitle(title, url) {
  if (!parseYouTubeUrl(url)) return title;
  // "(3) Some video - YouTube" → "Some video"
  return title.replace(/^\(\d+\+?\)\s*/, '').replace(/\s+-\s+YouTube(?: Music)?$/, '');
}

function showNotice(text, kind = '') {
  els.notice.className = `notice ${kind}`.trim();
  els.noticeText.textContent = text;
  els.notice.hidden = false;
}

function checkboxes() {
  return [...els.list.querySelectorAll('input[type="checkbox"]')];
}

function updateControls() {
  const configured = Boolean(state.settings?.baseUrl);
  const boxes = checkboxes();
  const checked = boxes.filter((box) => box.checked).length;

  els.sendPage.disabled = state.busy || !configured || !state.pageUrl;
  els.sendSelected.disabled = state.busy || !configured || checked === 0;
  els.selectAll.disabled = state.busy || boxes.length === 0 || checked === boxes.length;
  els.selectNone.disabled = state.busy || checked === 0;
  if (!state.busy) els.sendSelected.textContent = checked ? `Send ${checked} selected` : 'Send selected';

  if (state.scanned && state.items.length) {
    const noun = state.items.length === 1 ? 'link' : 'links';
    els.count.textContent = `${state.items.length} YouTube ${noun}${checked ? ` · ${checked} selected` : ''}`;
  }
}

function renderDefaults() {
  if (!state.settings?.baseUrl) {
    els.defaults.textContent = 'Not configured';
    return;
  }
  const options = downloadOptions(state.settings, { audio: els.audioOnly.checked });
  els.defaults.textContent = describeOptions(options);
}

function renderCurrentPage() {
  const { tab } = state;
  state.pageUrl = tab?.url ? normalizeUrl(tab.url) : null;
  els.pageTitle.textContent = tab?.title ? cleanPageTitle(tab.title, tab.url) : 'Untitled';
  els.pageTitle.title = els.pageTitle.textContent;
  els.pageUrl.textContent = state.pageUrl ? displayUrl(state.pageUrl) : "This page can't be sent to MeTube";
  els.pageUrl.title = state.pageUrl ?? '';
}

function tagFor(item) {
  if (item.kind === 'playlist') return ['Playlist', 'Whole playlist'];
  if (item.kind === 'short') return ['Short', 'YouTube Short'];
  if (item.list) return ['In playlist', 'Video link that also carries a playlist ID'];
  return null;
}

function renderItem(item, index) {
  const li = document.createElement('li');
  li.className = 'item';
  li.dataset.url = item.url;

  const label = document.createElement('label');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.dataset.index = String(index);

  const meta = document.createElement('div');
  meta.className = 'item-meta';
  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = item.title || displayUrl(item.url);
  title.title = title.textContent;

  const sub = document.createElement('div');
  sub.className = 'item-sub';
  const tag = tagFor(item);
  if (tag) {
    const tagEl = document.createElement('span');
    tagEl.className = 'tag';
    [tagEl.textContent, tagEl.title] = tag;
    sub.append(tagEl);
  }
  const url = document.createElement('span');
  url.className = 'url muted';
  url.textContent = displayUrl(item.url);
  url.title = item.url;
  sub.append(url);
  meta.append(title, sub);

  const status = document.createElement('span');
  status.className = 'status';

  label.append(box, meta, status);
  li.append(label);
  return li;
}

function renderList(emptyMessage) {
  state.scanned = true;
  const { items } = state;
  els.list.replaceChildren(...items.map(renderItem));
  els.list.hidden = items.length === 0;
  els.empty.hidden = items.length > 0;
  els.empty.textContent = emptyMessage;
  if (!items.length) els.count.textContent = 'No links';
  updateControls();
}

function collectLinks(rawLinks) {
  const byKey = new Map();
  for (const { href, title, score } of rawLinks) {
    const link = parseYouTubeUrl(href);
    if (!link) continue;
    const existing = byKey.get(link.key);
    if (!existing) byKey.set(link.key, { ...link, title, score });
    else if (score > existing.score) Object.assign(existing, { title, score });
  }
  return [...byKey.values()];
}

async function scan() {
  const { tab } = state;
  if (!tab?.id || !/^https?:/.test(tab.url ?? '')) {
    renderList("This page can't be scanned.");
    return;
  }
  try {
    const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scanPage });
    state.items = collectLinks(injection?.result?.links ?? []);
    renderList('No YouTube links found on this page.');
  } catch (err) {
    renderList(`Can't scan this page: ${err.message}`);
  }
}

function setBusy(busy, button) {
  state.busy = busy;
  if (busy && button) {
    button.dataset.label = button.textContent;
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    button.replaceChildren(spinner, document.createTextNode('Sending…'));
  } else if (button?.dataset.label) {
    button.textContent = button.dataset.label;
  }
  updateControls();
}

function markResults(results) {
  const byUrl = new Map(results.map((r) => [r.url, r]));
  for (const li of els.list.children) {
    const result = byUrl.get(li.dataset.url);
    if (!result) continue;
    const box = li.querySelector('input');
    const status = li.querySelector('.status');
    li.classList.toggle('sent', result.ok);
    li.classList.toggle('failed', !result.ok);
    status.textContent = result.ok ? '✓' : '✕';
    status.title = result.ok ? 'Sent' : result.error;
    if (result.ok) box.checked = false;
  }
}

async function send(urls, button) {
  const audio = els.audioOnly.checked;
  els.notice.hidden = true;
  setBusy(true, button);
  let response;
  try {
    response = await chrome.runtime.sendMessage({ type: 'send', urls, audio });
  } catch (err) {
    response = { ok: false, error: err.message };
  }
  setBusy(false, button);

  if (!response || response.ok === false) {
    showNotice(response?.error ?? 'The extension background did not answer.', 'error');
    return;
  }
  const { results } = response;
  markResults(results);
  updateControls();

  const failed = results.filter((r) => !r.ok);
  const sent = results.length - failed.length;
  if (!failed.length) {
    showNotice(`Sent ${sent} ${sent === 1 ? 'link' : 'links'} to MeTube${audio ? ' (audio)' : ''}.`, 'ok');
  } else {
    const prefix = results.length === 1 ? 'Not sent' : `${failed.length} of ${results.length} failed`;
    showNotice(`${prefix}: ${failed[0].error}`, 'error');
    // The error is on screen now: clear the red badge.
    chrome.action.setBadgeText({ text: '' });
  }
}

async function showLastFailure() {
  if ((await chrome.action.getBadgeText({})) !== '!') return;
  const { lastResult } = await chrome.storage.session.get('lastResult');
  if (lastResult?.failed?.length) {
    const { failed, total } = lastResult;
    const prefix = total === 1 ? 'Last send failed' : `Last send: ${failed.length} of ${total} failed`;
    showNotice(`${prefix}: ${failed[0].error}`, 'error');
  }
  chrome.action.setBadgeText({ text: '' });
}

function openOptions() {
  chrome.runtime.openOptionsPage();
  window.close();
}

function wireEvents() {
  els.openOptions.addEventListener('click', openOptions);
  els.setupBtn.addEventListener('click', openOptions);
  els.openMetube.addEventListener('click', () => {
    chrome.tabs.create({ url: `${state.settings.baseUrl}/` });
    window.close();
  });
  els.noticeClose.addEventListener('click', () => {
    els.notice.hidden = true;
  });
  els.audioOnly.addEventListener('change', renderDefaults);

  els.selectAll.addEventListener('click', () => {
    for (const box of checkboxes()) box.checked = true;
    updateControls();
  });
  els.selectNone.addEventListener('click', () => {
    for (const box of checkboxes()) box.checked = false;
    updateControls();
  });

  // Shift-click selects a range.
  els.list.addEventListener('click', (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    const index = Number(event.target.dataset.index);
    if (event.shiftKey && state.lastClicked >= 0) {
      const boxes = checkboxes();
      const [from, to] = [Math.min(index, state.lastClicked), Math.max(index, state.lastClicked)];
      for (let i = from; i <= to; i++) boxes[i].checked = event.target.checked;
    }
    state.lastClicked = index;
    updateControls();
  });

  els.sendPage.addEventListener('click', () => send([state.pageUrl], els.sendPage));
  els.sendSelected.addEventListener('click', () => {
    const urls = checkboxes()
      .filter((box) => box.checked)
      .map((box) => state.items[Number(box.dataset.index)].url);
    send(urls, els.sendSelected);
  });
}

async function init() {
  wireEvents();
  const [settings, [tab]] = await Promise.all([
    loadSettings(),
    chrome.tabs.query({ active: true, currentWindow: true }),
  ]);
  state.settings = settings;
  state.tab = tab;

  els.setup.hidden = Boolean(settings.baseUrl);
  els.openMetube.hidden = !settings.baseUrl;
  renderDefaults();
  renderCurrentPage();
  updateControls();
  await showLastFailure();
  await scan();
}

init();
