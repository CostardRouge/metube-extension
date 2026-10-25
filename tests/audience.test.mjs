// Run with: node --test
// The website's audience measurement (docs/audience.js) and the legal notice
// that describes it, held together: the tracker's host, id and decline rules,
// the switch's key, and the notice's words in both languages. A change to what
// is measured or kept fails here until the notice says the same.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

import { AUDIENCE, OPT_OUT_KEY, counting, setOptedOut, startAudience, trackerData } from '../docs/audience.js';
import { fr } from '../docs/i18n.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const html = read('docs/index.html');
const siteJs = read('docs/site.js');

// The English of a data-i18n element, from the page.
const english = (key) => html.match(new RegExp(`data-i18n="${key}">([\\s\\S]*?)</span>`))?.[1] ?? '';
const notice = {
  en: ['legalMeasure', 'legalDecline', 'legalDevice'].map(english).join(' '),
  fr: [fr.legalMeasure, fr.legalDecline, fr.legalDevice].join(' '),
};

/** A minimal document: a head that collects what is appended, and querySelector over it. */
function fakeDocument() {
  const head = [];
  return {
    head: { append: (node) => head.push(node) },
    createElement: (tag) => ({ tag, dataset: {} }),
    querySelector: () => (head.length ? head[0] : null),
    appended: head,
  };
}
function fakeStorage(entries = {}) {
  const map = new Map(Object.entries(entries));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}
const start = (overrides = {}) =>
  startAudience({ doc: fakeDocument(), nav: {}, win: {}, storage: fakeStorage(), ...overrides });

test('the tracker: the self-hosted instance under /insight, this site\'s id, the GitHub Pages host', () => {
  const src = new URL(AUDIENCE.src);
  assert.equal(src.protocol, 'https:');
  assert.equal(src.host, 'insight.steevepommier.com');
  assert.equal(src.pathname, '/insight', 'never /script.js, which filter lists block');
  assert.equal(AUDIENCE.websiteId, '34e8b473-6182-4961-b76a-7c981a9a5a2f');
  assert.equal(AUDIENCE.domains, 'costardrouge.github.io');
});

test('the tag carries the id, the host and the decline rules, with no query or fragment', () => {
  const doc = fakeDocument();
  const script = startAudience({ doc, nav: {}, win: {}, storage: fakeStorage() });
  assert.ok(script);
  assert.equal(doc.appended.length, 1);
  assert.equal(script.src, AUDIENCE.src);
  assert.equal(script.defer, true);
  assert.deepEqual(script.dataset, { umami: 'audience', ...trackerData() });
  assert.equal(script.dataset.websiteId, AUDIENCE.websiteId);
  assert.equal(script.dataset.domains, 'costardrouge.github.io');
  assert.equal(script.dataset.doNotTrack, 'true');
  assert.equal(script.dataset.excludeSearch, 'true');
  assert.equal(script.dataset.excludeHash, 'true');
  assert.equal(script.dataset.autoTrack, undefined, 'automatic page views, no event by hand');
  assert.equal(startAudience({ doc, nav: {}, win: {}, storage: fakeStorage() }), null, 'never twice');
});

test('a visitor who declines loads nothing: Do Not Track, Global Privacy Control, the opt-out key', () => {
  assert.equal(start({ nav: { doNotTrack: '1' } }), null);
  assert.equal(start({ win: { doNotTrack: '1' } }), null);
  assert.equal(start({ nav: { globalPrivacyControl: true } }), null);
  assert.equal(start({ storage: fakeStorage({ [OPT_OUT_KEY]: '1' }) }), null);
  assert.ok(start({ nav: { doNotTrack: '0', globalPrivacyControl: false } }), 'an explicit yes counts');
  assert.ok(start({ storage: null }), 'no storage, no signal: counted');
});

test('an empty id is the kill switch, and the id lives in audience.js alone', () => {
  assert.equal(start({ config: { ...AUDIENCE, websiteId: '' } }), null);
  assert.equal(counting({ ...AUDIENCE, websiteId: ' ' }, 'costardrouge.github.io'), false);
  assert.equal(counting(AUDIENCE, 'costardrouge.github.io'), true);
  assert.equal(counting(AUDIENCE, 'localhost'), false, 'a local preview never counts');
  const homes = readdirSync(new URL('docs/', root))
    .filter((f) => /\.(js|html)$/.test(f))
    .filter((f) => read(`docs/${f}`).includes(AUDIENCE.websiteId));
  assert.deepEqual(homes, ['audience.js']);
});

test('the switch sets and clears Umami\'s own key', () => {
  assert.equal(OPT_OUT_KEY, 'umami.disabled');
  const storage = fakeStorage();
  setOptedOut(true, storage);
  assert.equal(storage.getItem('umami.disabled'), '1');
  setOptedOut(false, storage);
  assert.equal(storage.getItem('umami.disabled'), null);
  assert.doesNotThrow(() => setOptedOut(true, null));
  assert.match(html, /id="audience-toggle"/);
  assert.match(siteJs, /setOptedOut\(off\)/);
});

test('the page loads the loader, and no script from anywhere else', () => {
  const sources = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(sources, ['audience.js', 'site.js']);
  assert.match(html, /<script type="module" src="audience.js"><\/script>/);
  for (const file of readdirSync(new URL('docs/', root)).filter((f) => /\.(js|html)$/.test(f))) {
    assert.doesNotMatch(read(`docs/${file}`), /umami\.track\s*\(|data-umami-event/, `docs/${file}: no event`);
  }
});

test('the legal notice says what the code does, in English and in French', () => {
  for (const [lang, text] of Object.entries(notice)) {
    assert.ok(text.includes(new URL(AUDIENCE.src).host), `${lang}: the host`);
    assert.ok(text.includes(AUDIENCE.domains), `${lang}: the counting host`);
    assert.ok(text.includes(OPT_OUT_KEY), `${lang}: the opt-out key`);
    assert.ok(text.includes('<code>lang</code>'), `${lang}: the language key`);
    assert.match(text, /Umami/, lang);
    assert.match(text, /Do Not Track/, lang);
    assert.match(text, /Global Privacy Control/, lang);
    assert.match(text, /\bIP\b/, lang);
  }
  assert.match(notice.en, /No cookie/);
  assert.match(notice.en, /no event/);
  assert.match(notice.en, /without query string or fragment/);
  assert.match(notice.en, /nothing is sent/);
  assert.match(notice.fr, /Aucun cookie/);
  assert.match(notice.fr, /aucun événement/);
  assert.match(notice.fr, /sans paramètres ni fragment/);
  assert.match(notice.fr, /rien n’est envoyé/);
  assert.doesNotMatch(html, /loads no tracker/);
  assert.match(html, /href="#legal"/, 'the footer links the notice');
});

test('the French follows the no-break space rule in what the measurement added', () => {
  const keys = Object.keys(fr).filter((k) => /^(legalMeasure|legalDecline|legalDevice|audience)/.test(k));
  for (const key of keys) assert.doesNotMatch(fr[key], / [:;?!]/, `${key}: a plain space before : ; ? !`);
});

test('llms.txt no longer says the page measures nothing', () => {
  assert.doesNotMatch(read('docs/llms.txt'), /audience measurement \(none\)/);
});
