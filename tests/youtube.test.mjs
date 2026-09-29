// Run with: node --test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dedupeLinks, findYouTubeUrlsInText, normalizeUrl, parseYouTubeUrl } from '../lib/youtube.js';

const ID = 'dQw4w9WgXcQ';
const LIST = 'PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG';

test('watch URLs keep only v, list and t', () => {
  const link = parseYouTubeUrl(
    `https://www.youtube.com/watch?v=${ID}&list=${LIST}&index=4&t=42s&si=abc&pp=xyz&feature=share`,
  );
  assert.equal(link.url, `https://www.youtube.com/watch?v=${ID}&list=${LIST}&t=42s`);
  assert.equal(link.kind, 'video');
  assert.equal(link.id, ID);
  assert.equal(link.list, LIST);
});

test('youtu.be, m., /live/ and /embed/ become canonical watch URLs', () => {
  assert.equal(
    parseYouTubeUrl(`https://youtu.be/${ID}?si=track&t=90`).url,
    `https://www.youtube.com/watch?v=${ID}&t=90`,
  );
  assert.equal(
    parseYouTubeUrl(`https://m.youtube.com/watch?v=${ID}&feature=youtu.be`).url,
    `https://www.youtube.com/watch?v=${ID}`,
  );
  assert.equal(parseYouTubeUrl(`http://youtube.com/watch?v=${ID}`).url, `https://www.youtube.com/watch?v=${ID}`);
  assert.equal(parseYouTubeUrl(`https://www.youtube.com/live/${ID}?si=x`).url, `https://www.youtube.com/watch?v=${ID}`);
  assert.equal(
    parseYouTubeUrl(`https://www.youtube-nocookie.com/embed/${ID}?start=30&rel=0`).url,
    `https://www.youtube.com/watch?v=${ID}&t=30`,
  );
  assert.equal(
    parseYouTubeUrl(`https://www.youtube.com/embed/videoseries?list=${LIST}`).url,
    `https://www.youtube.com/playlist?list=${LIST}`,
  );
});

test('shorts and playlists', () => {
  const short = parseYouTubeUrl(`https://www.youtube.com/shorts/${ID}?feature=share`);
  assert.equal(short.url, `https://www.youtube.com/shorts/${ID}`);
  assert.equal(short.kind, 'short');

  const playlist = parseYouTubeUrl(`https://www.youtube.com/playlist?list=${LIST}&si=abc`);
  assert.equal(playlist.url, `https://www.youtube.com/playlist?list=${LIST}`);
  assert.equal(playlist.kind, 'playlist');

  assert.equal(
    parseYouTubeUrl(`https://music.youtube.com/watch?v=${ID}&si=abc`).url,
    `https://music.youtube.com/watch?v=${ID}`,
  );
});

test('relative hrefs resolve against a base', () => {
  assert.equal(
    parseYouTubeUrl(`/watch?v=${ID}&pp=abc`, 'https://www.youtube.com/feed/subscriptions').url,
    `https://www.youtube.com/watch?v=${ID}`,
  );
});

test('private lists are dropped, private playlists ignored', () => {
  assert.equal(
    parseYouTubeUrl(`https://www.youtube.com/watch?v=${ID}&list=WL`).url,
    `https://www.youtube.com/watch?v=${ID}`,
  );
  assert.equal(parseYouTubeUrl('https://www.youtube.com/playlist?list=LL'), null);
});

test('non-video URLs are rejected', () => {
  for (const url of [
    'https://www.youtube.com/',
    'https://www.youtube.com/@channel',
    'https://www.youtube.com/feed/subscriptions',
    'https://www.youtube.com/watch?v=short',
    'https://studio.youtube.com/video/dQw4w9WgXcQ/edit',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
    'javascript:alert(1)',
    'not a url',
  ]) {
    assert.equal(parseYouTubeUrl(url), null, url);
  }
});

test('normalizeUrl passes other http(s) sites through', () => {
  assert.equal(normalizeUrl('https://vimeo.com/123?x=1'), 'https://vimeo.com/123?x=1');
  assert.equal(normalizeUrl(`https://youtu.be/${ID}?si=x`), `https://www.youtube.com/watch?v=${ID}`);
  assert.equal(normalizeUrl('chrome://extensions'), null);
  assert.equal(normalizeUrl(undefined), null);
});

test('findYouTubeUrlsInText finds bare and schemeless links', () => {
  const text = `Watch (https://youtu.be/${ID}?si=a), also youtube.com/shorts/${ID}. And www.youtube.com/playlist?list=${LIST}!`;
  assert.deepEqual(
    findYouTubeUrlsInText(text).map((l) => l.url),
    [
      `https://www.youtube.com/watch?v=${ID}`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://www.youtube.com/playlist?list=${LIST}`,
    ],
  );
});

test('dedupeLinks merges the same video regardless of form', () => {
  const links = [
    `https://youtu.be/${ID}`,
    `https://www.youtube.com/watch?v=${ID}&si=abc`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/watch?v=${ID}&t=10`,
    `https://www.youtube.com/watch?v=${ID}&list=${LIST}`,
  ].map((url) => parseYouTubeUrl(url));
  assert.deepEqual(
    dedupeLinks(links).map((l) => l.url),
    [`https://www.youtube.com/watch?v=${ID}`, `https://www.youtube.com/watch?v=${ID}&list=${LIST}`],
  );
});
