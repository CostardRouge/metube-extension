// Run with: node --test
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';

import { useMessages } from '../lib/i18n.js';
import { authHeaders, getVersion, MeTubeError } from '../lib/metube.js';
import { buildAuthRule } from '../sw/auth-rule.js';

useMessages(JSON.parse(readFileSync(new URL('../_locales/en/messages.json', import.meta.url), 'utf8')));

const BASE = 'https://metube.example.com';
const TOKEN = { accessClientId: 'abc.access', accessClientSecret: 's3cret' };
const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

test('authHeaders: nothing configured sends nothing', () => {
  assert.deepEqual(authHeaders({ username: '', password: '' }), {});
  assert.deepEqual(authHeaders({}), {});
});

test('authHeaders: basic auth, UTF-8 encoded', () => {
  assert.deepEqual(authHeaders({ username: 'steeve', password: 'é' }), {
    Authorization: `Basic ${Buffer.from('steeve:é', 'utf8').toString('base64')}`,
  });
});

test('authHeaders: a Cloudflare Access service token needs both halves', () => {
  assert.deepEqual(authHeaders(TOKEN), {
    'CF-Access-Client-Id': 'abc.access',
    'CF-Access-Client-Secret': 's3cret',
  });
  assert.deepEqual(authHeaders({ accessClientId: 'abc.access', accessClientSecret: ' ' }), {});
  assert.deepEqual(authHeaders({ accessClientSecret: 's3cret' }), {});
});

test('authHeaders: basic auth and a service token together', () => {
  const headers = authHeaders({ username: 'u', password: 'p', ...TOKEN });
  assert.deepEqual(Object.keys(headers).sort(), ['Authorization', 'CF-Access-Client-Id', 'CF-Access-Client-Secret']);
});

test('requests carry the service token and never follow a redirect', async () => {
  let seen;
  globalThis.fetch = async (url, init) => {
    seen = { url, init };
    return new Response('{"version":"2026.11.01","yt-dlp":"2026.11.01"}', { status: 200 });
  };
  const info = await getVersion({ baseUrl: BASE, ...TOKEN });
  assert.equal(info.version, '2026.11.01');
  assert.equal(seen.url, `${BASE}/version`);
  assert.equal(seen.init.redirect, 'manual');
  assert.equal(seen.init.credentials, 'omit');
  assert.equal(seen.init.headers['CF-Access-Client-Id'], 'abc.access');
  assert.equal(seen.init.headers['CF-Access-Client-Secret'], 's3cret');
});

test('a redirect (Cloudflare Access sign-in page) is a fatal access error', async () => {
  // What fetch() returns for a redirect with redirect: 'manual'.
  globalThis.fetch = async () => ({ type: 'opaqueredirect', status: 0, text: async () => '' });
  await assert.rejects(getVersion({ baseUrl: BASE }), (err) => {
    assert.ok(err instanceof MeTubeError);
    assert.equal(err.code, 'access');
    assert.ok(err.fatal);
    assert.match(err.message, /metube\.example\.com redirected/);
    assert.match(err.message, /service token/);
    return true;
  });
});

test('buildAuthRule: the player gets the service token, for media GETs from the extension only', () => {
  const rule = buildAuthRule({ baseUrl: `${BASE}/mt`, ...TOKEN }, 'extid');
  assert.deepEqual(rule.action.requestHeaders, [
    { header: 'CF-Access-Client-Id', operation: 'set', value: 'abc.access' },
    { header: 'CF-Access-Client-Secret', operation: 'set', value: 's3cret' },
  ]);
  assert.deepEqual(rule.condition, {
    urlFilter: `|${BASE}/mt/`,
    initiatorDomains: ['extid'],
    resourceTypes: ['media'],
    requestMethods: ['get'],
  });
});

test('buildAuthRule: no credentials, no rule', () => {
  assert.equal(buildAuthRule({ baseUrl: BASE, username: '', password: '' }, 'extid'), null);
  assert.equal(buildAuthRule({ baseUrl: '', ...TOKEN }, 'extid'), null);
});
