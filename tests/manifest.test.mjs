// Run with: node --test
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));

test('version is valid for Chrome: 1 to 4 integers (0-65535), no leading zeros', () => {
  assert.match(manifest.version, /^(0|[1-9]\d*)(\.(0|[1-9]\d*)){0,3}$/);
  for (const part of manifest.version.split('.')) {
    assert.ok(Number(part) <= 65535, manifest.version);
  }
});

test('files referenced by the manifest exist', () => {
  const files = [
    manifest.background.service_worker,
    manifest.action.default_popup,
    manifest.options_ui.page,
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon),
  ];
  for (const file of files) {
    assert.ok(existsSync(new URL(file, root)), file);
  }
});
