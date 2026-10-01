// Run with: node --test
// The website in docs/: its English texts live in index.html (data-i18n
// elements) and docs/i18n.js, its French texts in docs/i18n.js only.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { en, fr } from '../docs/i18n.js';

const root = new URL('../docs/', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const js = readFileSync(new URL('site.js', root), 'utf8');

// Keys the page uses: data-i18n="…", data-i18n-<attr>="…", and t('…') in site.js.
const htmlKeys = new Set([...html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)].map((m) => m[1]));
const jsKeys = new Set([...js.matchAll(/\bt\('([A-Za-z0-9]+)'\)/g)].map((m) => m[1]));
const used = new Set([...htmlKeys, ...jsKeys]);

// English texts come from the HTML; only the keys JavaScript builds are in `en`.
const englishText = (key) => {
  if (key in en) return en[key];
  // Inner HTML up to the closing tag of the element that carries the key (no
  // element nests one of its own kind on the page).
  const m =
    html.match(new RegExp(`<([a-z0-9]+)[^>]*data-i18n="${key}"[^>]*>([\\s\\S]*?)</\\1>`))?.slice(1) ||
    html.match(new RegExp(`data-i18n-[a-z-]+="${key}"[^>]*?(?:title|aria-label|content|placeholder)="([^"]*)"`)) ||
    html.match(new RegExp(`(?:title|aria-label|content|placeholder)="([^"]*)"[^>]*data-i18n-[a-z-]+="${key}"`));
  return m?.[1] ?? '';
};

const placeholders = (text) => [...text.matchAll(/\$(\d)/g)].map((m) => m[1]).sort();
const tags = (text) => [...text.matchAll(/<\/?([a-z]+)/g)].map((m) => m[1]).sort();

test('every key the page uses has a French text, and nothing more', () => {
  const missing = [...used].filter((key) => !(key in fr));
  assert.deepEqual(missing, [], 'missing in fr');
  const unused = Object.keys(fr).filter((key) => !used.has(key));
  assert.deepEqual(unused, [], 'in fr but unused');
});

test('keys built by JavaScript have an English text too', () => {
  const missing = [...jsKeys].filter((key) => !htmlKeys.has(key) && !(key in en));
  assert.deepEqual(missing, [], 'missing in en');
});

test('French keeps the placeholders and markup of the English text', () => {
  for (const [key, text] of Object.entries(fr)) {
    assert.ok(text.trim(), `${key} is empty`);
    const english = englishText(key);
    assert.deepEqual(placeholders(text), placeholders(english), `${key} placeholders`);
    assert.deepEqual(tags(text), tags(english), `${key} markup`);
  }
});

test('the site links to files that exist', () => {
  for (const file of ['site.css', 'site.js', 'i18n.js', 'icon.svg', 'icon-128.png', '.nojekyll']) {
    assert.ok(existsSync(new URL(file, root)), `docs/${file}`);
  }
  for (const [, href] of html.matchAll(/(?:href|src)="([^"#:]+)"/g)) {
    assert.ok(existsSync(new URL(href, root)), `docs/${href}`);
  }
});

test('the English texts on the page are not empty', () => {
  for (const key of htmlKeys) assert.ok(englishText(key).trim(), key);
});
