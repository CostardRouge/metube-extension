# Media Chrome (vendored)

- Package: [media-chrome](https://www.npmjs.com/package/media-chrome) 4.19.3, MIT license (see `LICENSE`).
- Files: the package's ES modules (`dist/`), unmodified except that their source-map comments are
  removed. Only the 71 files reachable from the three entry points the player uses are kept:
  - `index.js` (the elements),
  - `menu/index.js` (the settings, captions and speed menus),
  - `lang/fr.js` (the French translation of Media Chrome's own labels).
- No bare imports, no dependencies, and nothing is loaded remotely, as Manifest V3 requires.
- `overlay/media-chrome.js` loads it in the browser's language.

To update: `npm pack media-chrome@<version>`, then copy the files reachable from those entry
points (follow the relative `import`s), drop the `//# sourceMappingURL` lines, and bump the
version here.
