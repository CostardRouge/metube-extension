// MeTube Sender website: language switch, the teaser animation, the menu demo,
// install tabs, copy buttons and the latest-release lookup. Plain ES module.

import { en, fr } from './i18n.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ i18n */

// English is what the HTML contains: capture it once, so both languages come
// from the same place and switching back never needs a reload.
const ATTRS = ['title', 'aria-label', 'content', 'placeholder'];
const strings = { en: { ...en }, fr };

for (const el of $$('[data-i18n]')) strings.en[el.dataset.i18n] ??= el.innerHTML;
for (const attr of ATTRS) {
  const key = `data-i18n-${attr}`;
  for (const el of $$(`[${key}]`)) strings.en[el.getAttribute(key)] ??= el.getAttribute(attr);
}

let lang = 'en';

export function t(key) {
  return strings[lang][key] ?? strings.en[key] ?? key;
}

function applyLanguage(next) {
  lang = strings[next] ? next : 'en';
  document.documentElement.lang = lang;
  for (const el of $$('[data-i18n]')) {
    const value = strings[lang][el.dataset.i18n];
    if (value != null) el.innerHTML = value;
  }
  for (const attr of ATTRS) {
    const key = `data-i18n-${attr}`;
    for (const el of $$(`[${key}]`)) {
      const value = strings[lang][el.getAttribute(key)];
      if (value != null) el.setAttribute(attr, value);
    }
  }
  try {
    localStorage.setItem('lang', lang);
  } catch {}
  const url = new URL(location.href);
  url.searchParams.set('lang', lang);
  history.replaceState(null, '', url);
  renderMenu();
  renderRelease();
}

function initialLanguage() {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (fromUrl) return fromUrl;
  try {
    const saved = localStorage.getItem('lang');
    if (saved) return saved;
  } catch {}
  return (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

$('#lang').addEventListener('click', () => applyLanguage(lang === 'fr' ? 'en' : 'fr'));

/* --------------------------------------------------------- latest release */

const RELEASES_API = 'https://api.github.com/repos/CostardRouge/metube-extension/releases/latest';
let release = null;

function renderRelease() {
  if (!release) return;
  $('#download-label').textContent = t('heroDownloadVersion').replace('$1', release.version);
  $('#download').href = release.url;
  $('#ext-card-version').textContent = release.version;
  if (release.date) {
    const date = new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(release.date);
    $('#release-note').innerHTML = t('heroNoteVersion').replace('$1', date);
  }
}

async function loadRelease() {
  try {
    const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) return;
    const data = await res.json();
    const zip = (data.assets || []).find((a) => a.name.endsWith('.zip'));
    release = {
      version: data.tag_name.replace(/^v/, ''),
      url: zip?.browser_download_url || data.html_url,
      date: data.published_at ? new Date(data.published_at) : null,
    };
    renderRelease();
  } catch {
    /* Offline or rate-limited: the button keeps its releases/latest link. */
  }
}

/* --------------------------------------------------------- install tabs */

const install = $('.install');
install.dataset.browser = 'chrome';
for (const tab of $$('.tab')) {
  tab.addEventListener('click', () => {
    for (const other of $$('.tab')) other.setAttribute('aria-selected', String(other === tab));
    install.dataset.browser = tab.dataset.tab;
    for (const url of $$('.browser-url')) url.textContent = `${tab.dataset.tab}://extensions`;
  });
}

/* ----------------------------------------------------------- copy buttons */

for (const btn of $$('.copy')) {
  btn.addEventListener('click', async () => {
    const code = $('code', btn.parentElement);
    try {
      await navigator.clipboard.writeText(code.innerText);
      btn.classList.add('done');
      setTimeout(() => btn.classList.remove('done'), 1600);
    } catch {}
  });
}

/* ----------------------------------------------------- fake "Test connection" */

$('#test-conn').addEventListener('click', async () => {
  const out = $('#test-result');
  out.className = 'sm-result';
  out.textContent = t('optConnecting').replace('$1', 'metube.example.com');
  await sleep(900);
  out.className = 'sm-result ok';
  out.textContent = t('optConnectedDemo');
});

/* ----------------------------------------------------------- menu demo */

const LAYOUT_HELP = {
  hybrid: () => t('layoutHybridHelp'),
  flat: () => t('layoutFlatHelp'),
  submenus: () => t('layoutSubmenusHelp'),
};

function menuModel(layout) {
  const video = [t('mBest'), t('m1080'), t('m720'), t('m480')];
  const audio = [t('mM4a'), t('mMp3'), t('mOpus')];
  const subs = [t('mSubsBoth'), t('mSubsFr'), t('mSubsEn')];
  const oneClick = (label) => ({ label, oneclick: true });
  const head = [{ label: t('menuSettings') }, { label: t('menuOpen') }, 'sep'];
  const tail = ['sep', { label: t('menuPlay'), hint: 'Alt+Shift+M' }];

  if (layout === 'flat') {
    return [
      ...head,
      { header: t('menuHeaderVideo') },
      oneClick(t('menuVideo1080')),
      ...[video[0], video[2], video[3]].map((label) => ({ label })),
      { header: t('menuHeaderAudio') },
      oneClick(t('menuAudioM4a')),
      ...audio.slice(1).map((label) => ({ label })),
      { header: t('menuHeaderSubtitles') },
      oneClick(t('menuSubsFrEn')),
      ...subs.slice(1).map((label) => ({ label })),
      ...tail,
    ];
  }
  if (layout === 'submenus') {
    return [
      ...head,
      { label: t('video'), sub: [oneClick(t('m1080')), ...[video[0], video[2], video[3]].map((label) => ({ label }))], open: true },
      { label: t('audio'), sub: [oneClick(t('mM4a')), ...audio.slice(1).map((label) => ({ label }))] },
      { label: t('subtitles'), sub: subs.map((label, i) => (i ? { label } : oneClick(label))) },
      ...tail,
    ];
  }
  return [
    ...head,
    oneClick(t('menuVideo1080')),
    oneClick(t('menuAudioM4a')),
    oneClick(t('menuSubsFrEn')),
    'sep',
    { label: t('menuMoreVideo'), sub: [video[0], video[2], video[3]].map((label) => ({ label })), open: true },
    { label: t('menuMoreAudio'), sub: audio.slice(1).map((label) => ({ label })) },
    { label: t('menuOneLanguage'), sub: subs.slice(1).map((label) => ({ label })) },
    ...tail,
  ];
}

function buildMenu(items) {
  const menu = document.createElement('div');
  menu.className = 'm';
  for (const item of items) {
    if (item === 'sep') {
      menu.insertAdjacentHTML('beforeend', '<div class="m-sep"></div>');
      continue;
    }
    if (item.header) {
      const h = document.createElement('div');
      h.className = 'm-header';
      h.textContent = item.header;
      menu.append(h);
      continue;
    }
    const el = document.createElement('div');
    el.className = 'm-item' + (item.oneclick ? ' oneclick' : '') + (item.sub ? ' has-sub' : '') + (item.open ? ' open' : '');
    el.textContent = item.label;
    if (item.hint) {
      const hint = document.createElement('span');
      hint.className = 'hint';
      hint.textContent = item.hint;
      el.append(hint);
    }
    if (item.sub) {
      el.append(buildMenu(item.sub));
      el.tabIndex = 0;
      const open = () => {
        for (const sib of $$(':scope > .m-item.open', menu)) sib.classList.remove('open');
        el.classList.add('open');
        fitSubmenus();
      };
      el.addEventListener('mouseenter', open);
      el.addEventListener('focus', open);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        el.classList.toggle('open');
        fitSubmenus();
      });
    }
    menu.append(el);
  }
  return menu;
}

// Submenus open to the right; when that leaves the stage, they open to the left.
function fitSubmenus() {
  const limit = document.documentElement.clientWidth - 8;
  const stage = $('.menu-stage').getBoundingClientRect();
  for (const sub of $$('.m-item.open > .m', $('#menu-render'))) {
    sub.classList.remove('flip');
    if (getComputedStyle(sub).position !== 'absolute') continue;
    const r = sub.getBoundingClientRect();
    if (r.right > limit && r.left - stage.left > 40) sub.classList.add('flip');
  }
}

function renderMenu() {
  const layout = $('input[name="layout"]:checked').value;
  $('#layout-help').textContent = LAYOUT_HELP[layout]();
  const root = $('#menu-render');
  root.replaceChildren();
  // The "MeTube ›" entry of Chrome's menu, and its submenu beside it in normal
  // flow, so the stage grows with the layout. Deeper submenus float (.m .m).
  const rootMenu = document.createElement('div');
  rootMenu.className = 'm';
  rootMenu.innerHTML = '<div class="m-item root has-sub open"><img src="icon.svg" alt="" width="14" height="14" />MeTube</div>';
  root.append(rootMenu, buildMenu(menuModel(layout)));
  fitSubmenus();
}

$('#layout').addEventListener('change', renderMenu);
addEventListener('resize', fitSubmenus);
document.fonts?.ready.then(fitSubmenus);

/* -------------------------------------------------------------- teaser */

const teaser = $('#teaser');
const cursor = $('#t-cursor');
const el = (id) => document.getElementById(id);
let run = 0; // increments to cancel a running timeline

function moveTo(target, ax = 0.5, ay = 0.5, offset = { x: 0, y: 0 }) {
  const box = teaser.getBoundingClientRect();
  const r = target.getBoundingClientRect();
  const x = r.left - box.left + r.width * ax + offset.x;
  const y = r.top - box.top + r.height * ay + offset.y;
  cursor.style.transform = `translate(${x}px, ${y}px)`;
}

async function click(kind = 'left') {
  cursor.classList.remove('click', 'right');
  void cursor.offsetWidth; // restart the ring animation
  cursor.classList.add('click');
  if (kind === 'right') cursor.classList.add('right');
  await sleep(180);
}

function show(node, on = true) {
  node.classList.toggle('show', on);
}

function caption(n) {
  for (const p of $$('.t-captions p')) p.classList.toggle('show', p.dataset.cap === String(n));
  for (const dot of $$('.t-steps i')) dot.classList.toggle('on', Number(dot.dataset.dot) <= n);
}

function placeMenus(anchor) {
  const body = $('.browser-body');
  const b = body.getBoundingClientRect();
  const r = anchor.getBoundingClientRect();
  const ctx = el('t-ctx');
  const sub = el('t-sub');
  // Hidden menus keep their layout (only the opacity changes), so they can be measured.
  const cw = ctx.offsetWidth;
  const ch = ctx.offsetHeight;
  const sw = sub.offsetWidth;
  const sh = sub.offsetHeight;
  const left = Math.max(8, Math.min(r.left - b.left + r.width * 0.35, b.width - cw - 8));
  const top = Math.max(8, Math.min(r.top - b.top + r.height * 0.5, b.height - ch - 8));
  ctx.style.left = `${left}px`;
  ctx.style.top = `${top}px`;
  // Submenu next to the MeTube entry: to the right if it fits, else to the left.
  const subLeft = left + cw + sw < b.width - 8 ? left + cw - 4 : Math.max(8, left - sw + 4);
  const subTop = Math.max(8, Math.min(top + 78, b.height - sh - 8));
  sub.style.left = `${subLeft}px`;
  sub.style.top = `${subTop}px`;
}

function resetTeaser() {
  for (const node of $$('.show', teaser)) node.classList.remove('show');
  for (const node of $$('.hot, .hover', teaser)) node.classList.remove('hot', 'hover');
  for (const node of $$('.t-popup-list li', teaser)) node.classList.remove('sent');
  for (const node of $$('.chk', teaser)) node.classList.remove('on');
  el('t-badge').classList.remove('on');
  el('t-badge').textContent = '';
  el('t-progress-bar').style.width = '0';
  el('t-range').style.width = '0';
  el('t-keys').classList.remove('press');
  caption(-1);
}

async function toast(text, ms = 1800) {
  el('t-toast-text').textContent = text;
  show(el('t-toast'));
  await sleep(ms);
  show(el('t-toast'), false);
}

function badge(value) {
  const b = el('t-badge');
  b.textContent = value;
  b.classList.remove('on');
  void b.offsetWidth;
  b.classList.add('on');
}

async function timeline(id) {
  const alive = () => id === run;
  const wait = async (ms) => {
    await sleep(ms);
    if (!alive()) throw new Error('cancelled');
  };

  resetTeaser();
  caption(0);
  const link = el('t-link2');
  moveTo(el('t-link4'), 0.2, 0.8);
  cursor.classList.add('show');
  await wait(1200);

  // 1. Right-click a link, pick "Video · 1080p · MP4".
  moveTo(link, 0.55, 0.5);
  await wait(700);
  link.classList.add('hot');
  await click('right');
  placeMenus(link);
  show(el('t-ctx'));
  await wait(750);
  const rootItem = el('t-ctx-metube');
  moveTo(rootItem, 0.4, 0.5);
  await wait(500);
  rootItem.classList.add('hover');
  show(el('t-sub'));
  await wait(650);
  const videoItem = el('t-sub-video');
  moveTo(videoItem, 0.4, 0.5);
  await wait(550);
  videoItem.classList.add('hover');
  await wait(350);
  await click();
  show(el('t-ctx'), false);
  show(el('t-sub'), false);
  link.classList.remove('hot');
  caption(1);
  badge('1');
  await Promise.all([toast(t('toastSent1')), wait(1800)]);
  await wait(800);

  // 2. Popup: select all, send.
  const icon = el('t-icon');
  moveTo(icon, 0.5, 0.5);
  await wait(650);
  icon.classList.add('hot');
  await click();
  show(el('t-popup'));
  caption(2);
  await wait(900);
  moveTo(el('t-all'), 0.5, 0.5);
  await wait(550);
  await click();
  for (const chk of $$('.t-popup-list .chk')) chk.classList.add('on');
  el('t-popup-count').textContent = t('popupSelected4');
  el('t-send').textContent = t('popupSend4');
  await wait(650);
  moveTo(el('t-send'), 0.5, 0.5);
  await wait(550);
  await click();
  el('t-send').classList.add('hot');
  const rows = $$('.t-popup-list li');
  for (const [i, row] of rows.entries()) {
    await wait(260);
    row.classList.add('sent');
    badge(String(2 + i));
  }
  await wait(1100);
  show(el('t-popup'), false);
  icon.classList.remove('hot');
  el('t-send').classList.remove('hot');
  await wait(500);

  // 3. Shortcut: the overlay looks the video up, shows the download, plays.
  cursor.classList.remove('show');
  caption(3);
  const keys = el('t-keys');
  show(keys);
  await wait(500);
  keys.classList.add('press');
  await wait(220);
  keys.classList.remove('press');
  show(el('t-overlay'));
  show(el('t-status'));
  el('t-status-text').textContent = t('overlayLookingUp');
  el('t-status-detail').textContent = '';
  await wait(700);
  show(keys, false);
  await wait(500);
  el('t-status-text').textContent = t('overlayDownloading');
  show(el('t-progress'));
  const bar = el('t-progress-bar');
  for (let p = 0; p <= 100; p += 8) {
    bar.style.width = `${p}%`;
    el('t-status-detail').textContent = t('overlayProgress').replace('$1', String(Math.min(p, 100))).replace('$2', `${(p * 3.1).toFixed(0)} MB`);
    await wait(180);
  }
  await wait(400);
  show(el('t-progress'), false);
  show(el('t-status'), false);
  show(el('t-video'));
  const range = el('t-range');
  const time = el('t-time');
  const total = 596;
  for (let s = 0; s <= total; s += 24) {
    range.style.width = `${(s / total) * 100}%`;
    time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} / 9:56`;
    await wait(110);
  }
  await wait(400);

  // 4. End screen: delete from MeTube.
  show(el('t-video'), false);
  show(el('t-end'));
  caption(4);
  await wait(900);
  const del = el('t-end-delete');
  moveTo(del, 0.5, 0.5);
  cursor.classList.add('show');
  await wait(650);
  del.classList.add('hot');
  await click();
  await wait(250);
  show(el('t-end'), false);
  show(el('t-overlay'), false);
  cursor.classList.remove('show');
  await Promise.all([toast(t('toastDeleted'), 2000), wait(2000)]);
  await wait(1400);
}

async function loop() {
  const id = ++run;
  try {
    while (id === run) await timeline(id);
  } catch {
    /* cancelled: a new run took over */
  }
}

function staticTeaser() {
  // Reduced motion: one still frame, the overlay playing, with every caption's dot lit.
  resetTeaser();
  badge('4');
  caption(3);
  show(el('t-overlay'));
  show(el('t-video'));
  el('t-range').style.width = '38%';
  el('t-time').textContent = '3:47 / 9:56';
}

let visible = false;
function start() {
  if (reduceMotion) {
    staticTeaser();
    return;
  }
  loop();
}

function stop() {
  run++;
}

el('t-replay').addEventListener('click', () => {
  if (reduceMotion) return;
  stop();
  loop();
});

const observer = new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting && !visible) {
      visible = true;
      start();
    } else if (!entry.isIntersecting && visible) {
      visible = false;
      if (!reduceMotion) stop();
    }
  },
  { threshold: 0.25 },
);
observer.observe(teaser);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop();
  else if (visible) start();
});

/* ------------------------------------------------------- scroll effects */

const reveal = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        reveal.unobserve(e.target);
      }
    }
  },
  { rootMargin: '0px 0px -8% 0px' },
);
for (const node of $$('.reveal')) reveal.observe(node);

const navLinks = $$('.nav a');
const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
const spy = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      for (const a of navLinks) a.classList.toggle('active', a.getAttribute('href') === `#${e.target.id}`);
    }
  },
  { rootMargin: '-40% 0px -55% 0px' },
);
for (const s of sections) spy.observe(s);

/* ---------------------------------------------------------------- init */

applyLanguage(initialLanguage());
loadRelease();
