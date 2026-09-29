// Run with: node --test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { describeProgress, fileUrl, findDownload, formatSize, subtitleUrls } from '../lib/history.js';

const ID = 'dQw4w9WgXcQ';
const BASE = 'https://metube.example.com/mt';

const item = (fields) => ({
  url: `https://www.youtube.com/watch?v=${ID}`,
  title: 'Never Gonna Give You Up',
  download_type: 'video',
  folder: '',
  timestamp: 1,
  ...fields,
});

test('absent when no item matches the video ID', () => {
  const history = { queue: [], pending: [], done: [item({ url: 'https://youtu.be/aaaaaaaaaaa', status: 'finished' })] };
  assert.deepEqual(findDownload(history, ID), { state: 'absent' });
  assert.deepEqual(findDownload({}, ID), { state: 'absent' });
});

test('matches by video ID whatever the URL form or custom prefix', () => {
  for (const url of [
    `https://youtu.be/${ID}?si=x`,
    `https://m.youtube.com/watch?v=${ID}&list=PL123456789`,
    `https://www.youtube.com/shorts/${ID}`,
  ]) {
    const history = { done: [item({ url, status: 'finished', filename: 'a.mp4' })] };
    assert.equal(findDownload(history, ID).state, 'finished', url);
  }
  const prefixed = {
    done: [item({ url: 'https://example.com/x', id: `myprefix.${ID}`, status: 'finished', filename: 'a.mp4' })],
  };
  assert.equal(findDownload(prefixed, ID).state, 'finished');
});

test('states: finished, active, pending, error', () => {
  assert.equal(findDownload({ queue: [item({ status: 'downloading', percent: 40 })] }, ID).state, 'active');
  assert.equal(findDownload({ queue: [item({ status: 'queued' })] }, ID).state, 'active');
  assert.equal(findDownload({ pending: [item({ status: 'pending' })] }, ID).state, 'pending');
  assert.equal(findDownload({ done: [item({ status: 'error', msg: 'Video unavailable' })] }, ID).state, 'error');
  assert.equal(findDownload({ done: [item({ status: 'finished' })] }, ID).state, 'error', 'finished without a file');
});

test('prefers a finished video, then audio, then in-progress; newest first', () => {
  const history = {
    queue: [item({ status: 'downloading', timestamp: 9 })],
    done: [
      item({ status: 'error', timestamp: 10 }),
      item({ status: 'finished', download_type: 'audio', filename: 'song.m4a', timestamp: 8 }),
      item({ status: 'finished', filename: 'old.mp4', timestamp: 2 }),
      item({ status: 'finished', filename: 'new.mp4', timestamp: 5 }),
      item({ status: 'finished', download_type: 'thumbnail', filename: 'thumb.jpg', timestamp: 11 }),
    ],
  };
  assert.equal(findDownload(history, ID).item.filename, 'new.mp4');
  history.done = history.done.filter((i) => i.download_type !== 'video');
  assert.equal(findDownload(history, ID).item.filename, 'song.m4a');
});

test('accepts [key, item] pairs and objects keyed by URL', () => {
  const entry = item({ status: 'finished', filename: 'a.mp4' });
  assert.equal(findDownload({ done: [[entry.url, entry]] }, ID).state, 'finished');
  assert.equal(findDownload({ done: { [entry.url]: entry } }, ID).state, 'finished');
});

test('file URL: download/ or audio_download/, folder and name encoded per segment', () => {
  assert.equal(
    fileUrl(BASE, item({ folder: 'music/80s', filename: 'Rick Astley - Never #1 [dQw4w9WgXcQ].mp4' })),
    `${BASE}/download/music/80s/Rick%20Astley%20-%20Never%20%231%20%5BdQw4w9WgXcQ%5D.mp4`,
  );
  assert.equal(fileUrl(BASE, item({ download_type: 'audio', filename: 'a.m4a' })), `${BASE}/audio_download/a.m4a`);
  assert.equal(
    fileUrl(BASE, item({ download_type: undefined, quality: 'audio', filename: 'a.mp3' })),
    `${BASE}/audio_download/a.mp3`,
  );
  assert.equal(fileUrl(BASE, item({ filename: 'Channel/../x.mp4' })), `${BASE}/download/Channel/x.mp4`);
});

test('subtitle URLs sit next to the file: <stem>.<lang>.vtt', () => {
  assert.deepEqual(subtitleUrls(BASE, item({ folder: 'yt', filename: 'My video.f137.mp4' }), ['fr', 'en']), [
    { lang: 'fr', url: `${BASE}/download/yt/My%20video.f137.fr.vtt` },
    { lang: 'en', url: `${BASE}/download/yt/My%20video.f137.en.vtt` },
  ]);
  assert.deepEqual(subtitleUrls(BASE, item({ filename: '' }), ['fr']), []);
});

test('progress text', () => {
  assert.deepEqual(describeProgress({ status: 'downloading', percent: 42.7, speed: 3_100_000, eta: 80 }), {
    text: 'Downloading 42% · 3.1 MB/s · 1:20 left',
    percent: 42.7,
  });
  assert.equal(describeProgress({ status: 'queued' }).text, 'Queued in MeTube');
  assert.equal(describeProgress({ status: 'postprocessing' }).percent, 100);
  assert.equal(describeProgress({ status: 'downloading', eta: 3725 }).text, 'Downloading · 1:02:05 left');
});

test('preferActive follows a re-added download over the stale finished entry', () => {
  const history = {
    queue: [item({ status: 'downloading', timestamp: 9 })],
    done: [item({ status: 'finished', filename: 'deleted.mp4', timestamp: 2 })],
  };
  assert.equal(findDownload(history, ID).state, 'finished');
  assert.equal(findDownload(history, ID, { preferActive: true }).state, 'active');
  // Once the new download is done, the newest finished entry wins.
  history.queue = [];
  history.done.push(item({ status: 'finished', filename: 'new.mp4', timestamp: 9 }));
  assert.equal(findDownload(history, ID, { preferActive: true }).item.filename, 'new.mp4');
});

test('formatSize', () => {
  assert.equal(formatSize(1_234_567_890), '1.2 GB');
  assert.equal(formatSize(734_003_200), '734 MB');
  assert.equal(formatSize(512), '512 B');
  assert.equal(formatSize(null), '');
});
