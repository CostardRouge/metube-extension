// Run with: node --test
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

import { describeOptions, qualityLabel } from '../lib/config.js';
import { describeProgress, formatSize } from '../lib/history.js';
import { formatNumber, languageName, t, tn, useMessages } from '../lib/i18n.js';
import {
  AUDIO_CHOICES,
  CONTEXTS,
  LAYOUTS,
  MENU_DEFAULTS,
  VIDEO_CHOICES,
  VIDEO_FORMATS,
  buildMenuItems,
} from '../lib/menu.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const locales = Object.fromEntries(
  readdirSync(new URL('_locales/', root)).map((lang) => [lang, JSON.parse(read(`_locales/${lang}/messages.json`))]),
);
const { en, fr } = locales;

// Every file the extension loads that may use messages.
const SOURCES = ['manifest.json', 'background.js'];
for (const dir of ['lib', 'sw', 'content', 'overlay', 'options', 'popup']) {
  for (const file of readdirSync(new URL(`${dir}/`, root))) {
    if (/\.(js|html)$/.test(file)) SOURCES.push(`${dir}/${file}`);
  }
}
const source = Object.fromEntries(SOURCES.map((file) => [file, read(file)]));
const all = Object.values(source).join('\n');

// No-break spaces vary with the ICU version: compare Intl output without them.
const plain = (text) => text.replace(/[\u00a0\u202f]/g, ' ');
const placeholders = (message) => [...message.matchAll(/\$(\d)/g)].map((m) => m[1]).sort();
const tags = (message) => [...message.matchAll(/<\/?([a-z]+)/g)].map((m) => m[0]).sort();

test('English is the default locale, and French is there', () => {
  assert.equal(JSON.parse(read('manifest.json')).default_locale, 'en');
  assert.deepEqual(Object.keys(locales).sort(), ['en', 'fr']);
});

test('every locale has the same keys, placeholders and markup as English', () => {
  for (const [lang, messages] of Object.entries(locales)) {
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(en).sort(), lang);
    for (const [key, { message }] of Object.entries(messages)) {
      assert.ok(message, `${lang}: ${key} is empty`);
      assert.deepEqual(placeholders(message), placeholders(en[key].message), `${lang}: ${key} placeholders`);
      assert.deepEqual(tags(message), tags(en[key].message), `${lang}: ${key} markup`);
    }
  }
});

test('message names and texts are valid for chrome.i18n', () => {
  for (const [lang, messages] of Object.entries(locales)) {
    for (const [key, { message }] of Object.entries(messages)) {
      assert.match(key, /^[A-Za-z0-9_]+$/, `${lang}: ${key}`);
      // "$name$" is a named placeholder: chrome.i18n rejects undefined ones.
      assert.doesNotMatch(message, /\$[A-Za-z0-9_@]+\$/, `${lang}: ${key}`);
    }
  }
});

test('every message used by the code exists, and every message is used', () => {
  const used = new Set();
  for (const [file, text] of Object.entries(source)) {
    const found = [
      ...text.matchAll(/\bt\(\s*'([A-Za-z0-9_]+)'/g),
      ...text.matchAll(/data-i18n(?:-[a-z-]+)?="([A-Za-z0-9_]+)"/g),
      ...text.matchAll(/__MSG_([A-Za-z0-9_]+)__/g),
      ...text.matchAll(/getMessage\('([A-Za-z0-9_]+)'/g),
    ].map((m) => m[1]);
    for (const key of found) {
      assert.ok(en[key], `${file}: "${key}" is not in _locales/en/messages.json`);
      used.add(key);
    }
    for (const [, key] of text.matchAll(/\btn\(\s*'([A-Za-z0-9_]+)'/g)) {
      for (const form of ['one', 'other']) assert.ok(en[`${key}_${form}`], `${file}: "${key}_${form}" is missing`);
      used.add(`${key}_one`).add(`${key}_other`);
    }
  }
  // Keys passed around as values (menu labels, captions…) appear quoted.
  const unused = Object.keys(en).filter((key) => !used.has(key) && !all.includes(`'${key}'`));
  assert.deepEqual(unused, [], 'unused messages');
});

test('menu labels are all translated (no key shows through)', () => {
  useMessages(en);
  const labels = [
    ...[...VIDEO_CHOICES, ...AUDIO_CHOICES].flatMap((c) => [c.label, c.short]),
    ...[...LAYOUTS, ...CONTEXTS, ...VIDEO_FORMATS].flatMap((c) => [c.label, c.help ?? 'x']),
  ];
  for (const label of labels) assert.doesNotMatch(label, /^[a-z]+[A-Z]\w*$/, label);
});

test('French: messages, plurals, numbers, sizes and language names', () => {
  useMessages(fr);
  try {
    assert.equal(t('menuOpen'), 'Ouvrir MeTube');
    assert.equal(t('withReason', 'Non envoyé', 'erreur'), 'Non envoyé\u00a0: erreur');
    assert.equal(tn('popupLinkCount', 1), '1 lien YouTube');
    assert.equal(tn('popupLinkCount', 0), '0 lien YouTube', 'French: 0 is singular');
    assert.equal(tn('popupLinkCount', 2), '2 liens YouTube');
    assert.equal(plain(tn('popupLinkCount', 1_000_000)), '1 000 000 liens YouTube', '"many" falls back to "other"');
    assert.equal(formatNumber(1.25, 1), '1,3');
    assert.equal(formatSize(1_234_567_890), '1,2\u00a0Go');
    assert.equal(formatSize(734_003_200), '734\u00a0Mo');
    assert.equal(languageName('en'), 'Anglais');
    assert.equal(qualityLabel('audio', '320'), '320\u00a0kbit/s');
    assert.equal(
      describeOptions({ downloadType: 'video', format: 'any', quality: 'best' }),
      'Vidéo · Tous · Meilleure',
    );
    assert.equal(
      plain(describeProgress({ status: 'downloading', percent: 42.7, speed: 3_100_000, eta: 80 }).text),
      'Téléchargement 42 % · 3,1 Mo/s · encore 1:20',
    );
    const items = buildMenuItems(structuredClone(MENU_DEFAULTS), { langs: ['fr', 'en'] });
    const title = (id) => items.find((item) => item.id === id).title;
    assert.equal(title('video:1080'), 'Vidéo · 1080p · MP4');
    assert.equal(title('subs:*'), 'Sous-titres · Français + Anglais (SRT)');
  } finally {
    useMessages(en);
  }
});

test('missing messages show their key', () => {
  useMessages({});
  try {
    assert.equal(t('nope'), 'nope');
  } finally {
    useMessages(en);
  }
});
