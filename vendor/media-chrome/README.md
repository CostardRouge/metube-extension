# Media Chrome (vendored)

- Package: [media-chrome](https://www.npmjs.com/package/media-chrome) 4.19.3, MIT license (see `LICENSE`)
- File: `dist/iife/all.js` from the npm tarball, copied as `media-chrome.js` with its
  `//# sourceMappingURL` line removed. SHA-256 of the original: `0e1e285a5a1ccf3389a175f49e9a0940275c6a6a2bcd5b89e8bc36b7aed1e050`
- It registers the `<media-*>` custom elements, menus included, as a classic script. It has no
  dependencies and loads nothing remotely, as Manifest V3 requires.

To update: `npm pack media-chrome@<version>`, then repeat the steps above and bump the
version here.
