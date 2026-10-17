# CI, releases and the website

Read before touching a workflow, `scripts/build.sh`, the release procedure or the website's deployment. The procedure itself is in the README ("Releasing", "Website").

## Decisions

- 2026-09-29 — **The tag is the version** (#3). `v1.2.0` and `1.2.0` both release `1.2.0`; `scripts/build.sh` writes it into the zip's `manifest.json` and leaves the repository's untouched. **Why**: the first two attempts published nothing — `0.0.1` did not match the `v*` trigger, and `v1` failed on "manifest.json has version 1.0.0, expected 1" with only "exit code 1" shown. **How to apply**: never require a manifest bump before tagging; report a refused version as an `::error::` annotation so the run summary says why.
- 2026-09-29 — **Nothing is released on a push to `main`**; a release needs a version tag on a commit of `main` (`release.yml` checks it), and tests pass before the build (#2). A release drafted by hand in the GitHub UI keeps its notes; the workflow only attaches the zip and its `.sha256`.
- 2026-09-29 — **The zip holds only what the browser loads**, plus `LICENSE` since 2026-10-17 (MIT asks for the notice in every copy) (`FILES` in `scripts/build.sh`), `manifest.json` at its root, so the same zip serves "Load unpacked" and the Chrome Web Store. CI keeps it 14 days as a plain `.zip` artifact (`archive: false`, not zipped twice) (#2).
- 2026-10-01 — **The website is `docs/`, plain files like the extension**, deployed by `pages.yml` when `docs/**` changes on `main`; its first run turned Pages on (`enablement: true`), so nothing was clicked in the settings (#7). Its download button reads the latest release from the GitHub API and falls back to `releases/latest`.
- 2026-10-08 — **Runners named `ubuntu-24.04`**, not `ubuntu-latest`, which moves to Ubuntu 26 from 2026-10-19: the OS move becomes a one-line choice. Actions on their Node 24 majors (#9).
- 2026-10-09 — **CI and releases run Node 24**, the Active LTS; the tests have no dependency and still pass on 22, so the README keeps "Node 22 or newer" (#10).

## Traps

- 2026-09-29 — **An unpacked extension's ID comes from its folder path.** Loading an update from another folder installs a second copy without the settings; the README and the release notes say to unzip over the same folder.
- 2026-09-29 — **Chrome's version format** is 1 to 4 integers from 0 to 65535 with no leading zeros; `1.0.0-beta`, `01.2` and `70000` are refused by `build.sh` before anything is built. The Web Store also refuses a version that is not higher than the last.
- 2026-10-17 — **`docs/` is published whole**, so nothing private or internal goes there; that is why the agent memory lives in `memory/`.
