# Architecture

How the extension is put together, and why. The file map is the README's "Development" section; this file is the reasons behind it. Read before touching the service worker, a permission, the auth rule, the menus or the vendored player.

## Shape (2026-10-17)

- `background.js` only registers listeners and routes messages; the work is in `sw/` (`menus`, `send`, `feedback`, `overlay`, `auth-rule`, `settings`), split out in #4 so each concern can grow without one 1,000-line worker.
- `lib/` holds what both the service worker and the pages use. `menu.js`, `history.js`, `youtube.js` are pure (no `chrome.*`) and unit-tested; `metube.js` is the only HTTP client; `i18n.js` wraps `chrome.i18n`; `config.js` holds the settings, their defaults and the format/quality catalogue.
- Pages: `popup/`, `options/` (`menu-editor.js` is the right-click menu section), `overlay/` (the player, shown in an iframe), `content/overlay-host.js` (injected on demand into YouTube). Shared dark theme in `ui/base.css`.

## Decisions

- 2026-09-29 — **No build step, no dependency.** The folder loads unpacked as it is, and the release zip is the same files (#1). **Why**: a personal tool the owner reloads by hand; a bundler would add a step between an edit and a test for nothing. **How to apply**: write browser-native ES modules; never add a runtime package.
- 2026-09-29 — **Media Chrome vendored as its unmodified ES modules**, 71 files reachable from `index.js`, `menu/index.js` and `lang/fr.js`; source-map comments dropped (#6). It was first vendored as the single IIFE build (#4), replaced because that build cannot take a translation. **How to apply**: update by the procedure in `vendor/media-chrome/README.md`; keep it unmodified.
- 2026-09-29 — **Every MeTube call comes from the service worker** (`lib/metube.js`), with `Authorization: Basic` UTF-8 encoded and `credentials: 'omit'`, so the browser never pops its own login dialog (#1). Pages ask the worker by message (`overlay:lookup`, `overlay:delete`…).
- 2026-09-29 — **The player's `<video>` gets its header from one dynamic `declarativeNetRequest` rule** (`sw/auth-rule.js`): `GET`, media requests, initiated by the extension, under the MeTube base URL; rebuilt whenever the settings change (#4). A `<video>` cannot send a header. Verified end to end that requests made by the YouTube page (`fetch` and `<video>`) never get it. **How to apply**: never widen the rule's conditions.
- 2026-09-29 — **`declarativeNetRequestWithHostAccess`, not `declarativeNetRequest`**: it acts only on hosts the user granted and adds no install warning (agreed with the owner, #4).
- 2026-09-29 — **The MeTube host is an optional host permission**, requested by `chrome.permissions.request` from inside the Save click (a permission request outside a user gesture is refused), and the old origin is released when the host changes (#1).
- 2026-09-29 — **The overlay is an extension page in a full-viewport iframe**, exposed through `web_accessible_resources` to `https://*.youtube.com/*` only (a test checks it). `overlay-host.js` reads only the address and the first `<video>`: it pauses it, keeps it paused, hands over `currentTime` when over 5 s, and closes the overlay on a video-ID change (`yt-navigate-finish`, `popstate`, a 1 s URL check). Closing never resumes YouTube (#4).
- 2026-09-29 — **The right-click menu is built from settings by a pure function** (`lib/menu.js`): the service worker rebuilds `chrome.contextMenus` on each save, one rebuild after another (chained in `createMenus`, so two quick saves never interleave one's `removeAll` with the other's `create` calls), and the options page previews with the same builder (#5). Three layouts (Hybrid default, Flat, Submenus), contexts page/link/selection/video; the icon menu (`action` context) holds at most 6 entries, Chrome's limit.
- 2026-09-29 — **What a menu click sends**: a selection's YouTube links (both `<a>` intersecting the range and URLs written as text, deduplicated), else the link, else the embedded YouTube player of the frame (`frameUrl`), else the page (#1, #5).
- 2026-09-29 — **Labels are getters**, translated when read, not when a module loads, so `lib/menu.js` stays importable by the tests with any locale (#6).

## Traps

- 2026-09-29 — **YouTube's own right-click menu comes first on the player**: an extension cannot change it; the MeTube entry appears on the second right-click. Chrome places the entry itself (near Inspect); no extension can put it at the top of a page menu. Documented in the README.
- 2026-09-29 — **The `autofocus` attribute is blocked in cross-origin frames** and logs a console error: the overlay focuses its dialog's Cancel button from code (#5).
- 2026-10-02 — **`allowfullscreen` is redundant with `allow="fullscreen"`** on the overlay iframe and only produced a console warning; removed (#8).
- 2026-09-29 — **Fullscreen goes through Media Chrome's request**, not the element's, so its controls stay visible in fullscreen (double-click, #6).
