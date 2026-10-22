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
  for (const file of ['site.css', 'site.js', 'i18n.js', 'icon.svg', '.nojekyll']) {
    assert.ok(existsSync(new URL(file, root)), `docs/${file}`);
  }
  for (const [, href] of html.matchAll(/(?:href|src)="([^"#:]+)"/g)) {
    assert.ok(existsSync(new URL(href, root)), `docs/${href}`);
  }
});

// COMMON-PROJECT-SPEC C11, whose failure is silent (every desktop tab looks right while an
// iPhone shows a screenshot of the page): the touch icon is 180×180 with no alpha channel, every
// icon the head and the manifest name exists at the size it claims, and the manifest's paths are
// relative, since the site lives under /metube-extension/.

/** Width, height and colour type from a PNG's IHDR chunk (colour type 2 = RGB, 6 = RGBA). */
const png = (file) => {
  const b = readFileSync(new URL(file, root));
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorType: b[25] };
};

test('the icon set: an opaque touch icon, every icon at its size, a manifest with relative paths', () => {
  assert.deepEqual(png('apple-touch-icon.png'), { width: 180, height: 180, colorType: 2 });
  const links = [...html.matchAll(/<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*href="([^"]+)"/g)];
  assert.equal(links.length, 5, 'the SVG icon, two favicons, the touch icon and the manifest');
  for (const [, href] of links) assert.ok(existsSync(new URL(href, root)), href);
  for (const [file, size] of [
    ['favicon-16.png', 16],
    ['favicon-32.png', 32],
  ]) {
    assert.deepEqual([png(file).width, png(file).height], [size, size], file);
  }
  const manifest = JSON.parse(readFileSync(new URL('manifest.webmanifest', root), 'utf8'));
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.icons.length, 4, 'any and maskable, 192 and 512');
  for (const icon of manifest.icons) {
    assert.ok(!icon.src.startsWith('/'), icon.src);
    const size = icon.sizes.split('x').map(Number);
    assert.deepEqual([png(icon.src).width, png(icon.src).height], size, icon.src);
  }
});

test('the English texts on the page are not empty', () => {
  for (const key of htmlKeys) assert.ok(englishText(key).trim(), key);
});

// COMMON-PROJECT-SPEC C17: docs/llms.txt, the llmstxt.org shape (an H1, a one-line blockquote summary,
// then `## Section` lists of `- [Title](absolute URL): what it is`), and every link it gives lands on
// something that exists — a section of the page, a file of the site, or the repository and its files.
const site = 'https://costardrouge.github.io/metube-extension/';
const repo = 'https://github.com/CostardRouge/metube-extension';

test('llms.txt has the llmstxt.org shape and links only to pages that exist', () => {
  const text = readFileSync(new URL('llms.txt', root), 'utf8');
  const lines = text.split('\n');
  assert.equal(lines[0], '# MeTube Sender', 'starts with the H1');
  assert.match(lines.find((line) => line.trim() && !line.startsWith('# ')) ?? '', /^> \S/, 'then a summary');
  assert.equal(lines.filter((line) => line.startsWith('# ')).length, 1, 'one H1');
  assert.ok(lines.some((line) => line.startsWith('## ')), 'sections');
  for (const line of lines.filter((l) => l.startsWith('- '))) {
    assert.match(line, /^- \[[^\]]+\]\(https:\/\/[^)]+\): \S/, line);
  }
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const links = [...text.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
  assert.ok(links.length > 0);
  for (const link of links) {
    if (link.startsWith(site)) {
      const [path, anchor] = link.slice(site.length).split('#');
      assert.ok(path === '' || existsSync(new URL(path, root)), `${link}: docs/${path}`);
      if (anchor !== undefined) assert.ok(ids.has(anchor), `${link}: no id="${anchor}" on the page`);
    } else if (link.startsWith(`${repo}/blob/main/`)) {
      const file = link.slice(`${repo}/blob/main/`.length);
      assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), `${link}: ${file}`);
    } else {
      assert.ok([repo, `${repo}/releases/latest`, `${repo}/issues`].includes(link), `unexpected link ${link}`);
    }
  }
});
