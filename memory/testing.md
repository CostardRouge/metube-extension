# Testing

What the unit tests cover, and how changes were checked in a real browser. Read before verifying a change that shows something or talks to MeTube.

## Unit tests (2026-10-17)

- `node --test` runs `tests/*.test.mjs` with Node's own runner, no dependency: URL detection and normalisation, history matching and ranking, file and subtitle URLs, every menu layout and context, settings validation, the id-to-`/add` mapping, sizes and plurals in both languages, every locale against English (keys, `$1…$9` placeholders, markup, every message used), the manifest (valid version, referenced files exist, the overlay exposed to YouTube only, `build.sh` packaging every folder), and the website (every key has a French text, placeholders and markup kept, local links resolve, the icon set is complete: an opaque 180×180 touch icon, every declared icon at its size, a manifest with relative paths — C11's failure is silent otherwise).
- What they cannot reach is anything with `chrome.*`: the service worker, the pages, the auth rule. That is what the browser runs below are for.
- 2026-10-19 — **The gate starts with the lint** (`npx --yes @biomejs/biome@2.5.15 lint .`, before `node --test`, in `ci.yml` and by hand): Biome's recommended rules, the HTML pages' accessibility rules included, which is the one static check the pages get (`memory/release.md` says what it found and what is suppressed).

## Browser runs (2026-10-17)

- Every feature pull request so far (#1, #4, #5, #6) was also checked end to end in the container's Chromium (`/opt/pw-browsers`, Playwright): the extension loaded unpacked, `www.youtube.com` and a `metube.test` host mapped to **small local HTTPS servers written for the run** — a fake MeTube with basic auth, `/history` progress, Range requests and `.vtt` files, a fake YouTube watch page. Those harnesses were never committed. **How to apply**: rebuild one for a change that needs it, in the scratchpad, and say in the pull request what it covered.
- The only patch allowed to the extension under test: pre-granting the fake MeTube host (no permission prompt in automation) and exposing a handler that a native gesture would otherwise trigger. Say so in the pull request.
- Run French with `--lang=fr`. Check both the popup and the options page, and the overlay's states (absent → added → progress → plays; failed; file gone; plain HTTP).
- **Not automatable, say so as untested**: the real permission prompt, a native context-menu click, pressing the actual browser shortcut, and Arc itself (the owner checks Arc by hand; it usually shows no extension notifications).
