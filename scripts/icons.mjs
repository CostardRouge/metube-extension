// Draws the website's PNG icons into docs/ from its three SVG sources (COMMON-PROJECT-SPEC C11):
// icon.svg (the rounded mark, transparent around it), icon-apple.svg (full bleed, for iOS) and
// icon-maskable.svg (full bleed, the mark inside the safe zone, for Android launchers).
// Run by hand after changing a source, and commit the PNGs: GitHub Pages cannot rasterise on
// request. sharp is not a dependency (the extension has none, and CI would pay a native install):
//
//   npm i --no-save sharp && node scripts/icons.mjs && rm -rf node_modules
//
// The touch icon is flattened and loses its alpha channel: iOS shows transparency as black.

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const docs = resolve(import.meta.dirname, '../docs');
const src = async (name) => readFile(resolve(docs, name));

const jobs = [
  ['icon.svg', 'favicon-16.png', 16],
  ['icon.svg', 'favicon-32.png', 32],
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['icon-maskable.svg', 'icon-maskable-192.png', 192],
  ['icon-maskable.svg', 'icon-maskable-512.png', 512],
];
for (const [from, to, size] of jobs) {
  await sharp(await src(from), { density: 384 })
    .resize(size, size)
    .png()
    .toFile(resolve(docs, to));
}
await sharp(await src('icon-apple.svg'), { density: 384 })
  .resize(180, 180)
  .flatten({ background: '#d9252e' })
  .removeAlpha()
  .png()
  .toFile(resolve(docs, 'apple-touch-icon.png'));
console.log('icons written to', docs);
