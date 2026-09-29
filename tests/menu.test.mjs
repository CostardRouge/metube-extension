// Run with: node --test
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  MENU_DEFAULTS,
  TOOLBAR_LIMIT,
  buildMenuItems,
  menuDownloads,
  normalizeMenu,
  parseMenuItemId,
} from '../lib/menu.js';
import { useMessages } from '../lib/i18n.js';

useMessages(JSON.parse(readFileSync(new URL('../_locales/en/messages.json', import.meta.url), 'utf8')));

const LANGS = ['fr', 'en'];
const menu = (patch = {}) => normalizeMenu({ ...structuredClone(MENU_DEFAULTS), ...patch });
const byId = (items) => Object.fromEntries(items.map((item) => [item.id, item]));
const childrenOf = (items, parentId) => items.filter((item) => item.parentId === parentId && item.type !== 'separator');

test('normalizeMenu fills gaps and drops unknown values', () => {
  assert.deepEqual(normalizeMenu(undefined), normalizeMenu(MENU_DEFAULTS));
  const m = normalizeMenu({
    layout: 'bogus',
    video: { qualities: ['720', 'nope', 'best'], oneClick: '2160' },
    audio: { choices: [], oneClick: 'm4a' },
    contexts: { link: false },
  });
  assert.equal(m.layout, 'hybrid');
  assert.deepEqual(m.video.qualities, ['best', '720'], 'catalog order, unknown dropped');
  assert.equal(m.video.oneClick, 'best', 'one-click falls back to a selected quality');
  assert.equal(m.audio.oneClick, null);
  assert.deepEqual(m.contexts, { page: true, link: false, selection: true, video: true });
});

test('hybrid (default): settings first, defaults in one click, the rest under More…', () => {
  const items = buildMenuItems(menu(), { langs: LANGS, shortcut: 'Alt+Shift+M' });
  const ids = items.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');

  const top = childrenOf(items, 'root').map((item) => item.title);
  assert.deepEqual(top, [
    'FOR EACH YOUTUBE LINK IN THE SELECTION',
    'MeTube settings…',
    'Open MeTube',
    'Video · 1080p · MP4',
    'Audio · M4A',
    'Subtitles · French + English (SRT)',
    'More video qualities',
    'More audio formats',
    'Subtitles in one language',
    'Play here with MeTube (Alt+Shift+M)',
  ]);
  assert.deepEqual(
    childrenOf(items, 'more-video').map((i) => i.id),
    ['video:best', 'video:720', 'video:480'],
  );
  assert.deepEqual(
    childrenOf(items, 'more-subs').map((i) => i.id),
    ['subs:fr', 'subs:en'],
  );

  const item = byId(items);
  assert.deepEqual(item['hdr-selection'].contexts, ['selection']);
  assert.equal(item['hdr-selection'].enabled, false);
  assert.deepEqual(item.play.contexts, ['page', 'video']);
  assert.ok(item.play.documentUrlPatterns.includes('https://www.youtube.com/watch*'));
});

test('flat: section titles are disabled items', () => {
  const items = buildMenuItems(menu({ layout: 'flat', settingsFirst: false }), { langs: LANGS });
  const titles = childrenOf(items, 'root').map((item) => (item.enabled === false ? `[${item.title}]` : item.title));
  assert.deepEqual(titles, [
    '[FOR EACH YOUTUBE LINK IN THE SELECTION]',
    '[VIDEO]',
    'Best quality · MP4',
    '1080p · MP4',
    '720p · MP4',
    '480p · MP4',
    '[AUDIO]',
    'M4A · best quality',
    'MP3 · 320 kbps',
    'Opus · best quality',
    '[SUBTITLES]',
    'French · SRT',
    'English · SRT',
    'All: French + English (SRT)',
    'Play here with MeTube',
    'Open MeTube',
    'MeTube settings…',
  ]);
});

test('submenus: one per block', () => {
  const items = buildMenuItems(menu({ layout: 'submenus', video: { ...MENU_DEFAULTS.video, format: 'any' } }), {
    langs: ['fr'],
  });
  assert.deepEqual(
    childrenOf(items, 'root')
      .filter((i) => i.id.startsWith('grp-'))
      .map((i) => i.title),
    ['Video', 'Audio', 'Subtitles'],
  );
  assert.deepEqual(
    childrenOf(items, 'grp-video').map((i) => i.title),
    ['Best quality', '1080p', '720p', '480p'],
  );
  assert.deepEqual(
    childrenOf(items, 'grp-subs').map((i) => i.id),
    ['subs:fr'],
    'no "All" with one language',
  );
});

test('contexts and blocks can be turned off', () => {
  const none = buildMenuItems(
    menu({ contexts: { page: false, link: false, selection: false, video: false }, toolbar: false }),
    { langs: LANGS },
  );
  assert.deepEqual(none, []);

  const linksOnly = buildMenuItems(
    menu({
      contexts: { page: false, link: true, selection: false, video: false },
      subtitles: { enabled: false, format: 'srt' },
    }),
    { langs: LANGS },
  );
  const item = byId(linksOnly);
  assert.deepEqual(item.root.contexts, ['link']);
  assert.equal(item['hdr-selection'], undefined);
  assert.equal(item.play, undefined, 'the player needs the page or video context');
  assert.ok(!linksOnly.some((i) => String(i.id).includes('subs')));
});

test('extension icon menu: at most 6 entries, in the action context', () => {
  const toolbar = buildMenuItems(menu(), { langs: LANGS, shortcut: 'Alt+Shift+M' }).filter((i) =>
    i.contexts.includes('action'),
  );
  assert.ok(toolbar.length <= TOOLBAR_LIMIT);
  assert.deepEqual(
    toolbar.map((i) => i.title),
    [
      'Play this video here (Alt+Shift+M)',
      'Download this page · 1080p · MP4',
      'Audio of this page · M4A',
      'Subtitles of this page · French + English (SRT)',
      'Open MeTube',
      'MeTube settings…',
    ],
  );
  assert.ok(toolbar.every((i) => i.id.startsWith('tb|') && !i.parentId));
});

test('menu entries map to MeTube /add options', () => {
  const m = menu();
  assert.deepEqual(parseMenuItemId('tb|video:1080'), { toolbar: true, action: 'video', value: '1080' });
  assert.deepEqual(parseMenuItemId('settings'), { toolbar: false, action: 'settings', value: null });

  assert.deepEqual(menuDownloads(parseMenuItemId('video:720'), m, LANGS), {
    label: '720p · MP4',
    downloads: [{ downloadType: 'video', format: 'mp4', quality: '720' }],
  });
  assert.deepEqual(menuDownloads(parseMenuItemId('audio:mp3-320'), m, LANGS).downloads, [
    { downloadType: 'audio', format: 'mp3', quality: '320' },
  ]);
  const subs = menuDownloads(parseMenuItemId('subs:*'), m, LANGS);
  assert.equal(subs.label, 'French + English subtitles');
  assert.deepEqual(
    subs.downloads.map((d) => [d.downloadType, d.format, d.subtitleLanguage, d.subtitleMode]),
    [
      ['captions', 'srt', 'fr', 'prefer_manual'],
      ['captions', 'srt', 'en', 'prefer_manual'],
    ],
  );
  assert.equal(menuDownloads(parseMenuItemId('video:9999'), m, LANGS), null);
  assert.equal(menuDownloads(parseMenuItemId('open'), m, LANGS), null);
});
