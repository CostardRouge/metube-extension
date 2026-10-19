# Project memory — decisions, reasons, traps

Long-term memory of this repo, read at the start of **every** agent session (imported by `CLAUDE.md`). It holds what the code and `git log` cannot tell you: the choices made and their reasons, what was tried and rejected, the traps that cost time, how the maintainer likes to work.

This file is the **always-loaded index**. The detail lives in `memory/<topic>.md`, one file per area, loaded **on demand**: read the topic file(s) matching the area you are about to touch **before** acting (table at the bottom). Do not `@import` them into `CLAUDE.md`.

The memory was opened on 2026-10-17, three weeks into the project, and seeded from the merged pull requests (#1 to #10), whose descriptions carried the decisions until then.

## How to maintain (mandatory — CLAUDE.md rule 2)

- **When**: at the end of every task, before its commit, in the same commit. Writing is the **default**; only skip if there is truly nothing a future agent could use, and say so explicitly in the final message.
- **What**: a design/product decision, a non-obvious technical choice, an explicit rejection ("the maintainer did not want X because Y"), a trap and its remedy, a working preference. Not implementation detail readable in the diff, not what `git log` or the README already say.
- **Where**: the matching `memory/<topic>.md`; a new file only when no topic fits (kebab-case name, add it to the table below). Cross-cutting rules, working style, decisions-at-a-glance and open items stay in this index.
- **How**: search first and **update** the existing entry rather than adding a near-duplicate; delete what became false. One entry = one short paragraph: *decision → why → how to apply*, dated `YYYY-MM-DD` on first write and on each revision. Say the same thing **once**.
- **Language**: **English**, dense, factual. No session narration. No test counts (they rot).
- Budget: keep this index under ~200 lines and each topic file under ~150; if one outgrows that, split it.

## Working with Steeve Pommier

- 2026-10-17 — **Answers in French, short, results first.** He does not want the implementation detailed before he has something to try. **How to apply**: end a task with what to load and click in Chrome or Arc; keep the how in the commit bodies and the pull request.
- 2026-10-17 — **He does not write code and tests by hand**, in Chrome and Arc, against his own MeTube behind Traefik basic auth. What costs is his time (reloading the extension, trying it on real videos, decisions), not code volume.
- 2026-10-17 — **He picks among mockups.** The right-click menu (variant C, plus the icon menu E) and deleting from the player were chosen from options shown to him first (#5). **How to apply**: for a visible change with more than one sensible shape, show two or three options before building one.

## Direction in five lines

- A personal tool first: send what is on screen to his MeTube in one gesture, and watch MeTube's copy in place of YouTube's player.
- Plain files, no build step, no dependency, no remote code: what is in the repo is what the browser runs (Manifest V3).
- Credentials never reach a page: the service worker makes the calls, and the player's media gets its header from a rule scoped to the extension.
- Touch YouTube as little as possible, so its redesigns do not break the extension.
- English and French everywhere, the extension and its website alike.

## Decisions at a glance (details in the topic files)

- No build step; Media Chrome 4.19.3 vendored as its unmodified ES modules (71 files), not its single-file build, because only the modules take a translation — `architecture.md`.
- Every MeTube request from the service worker, `credentials: 'omit'`; one `declarativeNetRequest` rule for the player's media; `declarativeNetRequestWithHostAccess`, so no install warning — `architecture.md`.
- The MeTube host is an optional permission requested on Save, from inside the click — `architecture.md`.
- The overlay finds a video in `/history` by video ID, prefers the in-progress entry after a re-add, and probes the file before playing — `metube.md`.
- Deleting from the player re-reads `/history`, then probes whether the file is really gone; it never deletes without a click — `metube.md`.
- The right-click menu is pure (`lib/menu.js`), rebuilt from the settings on each save, previewed by the same builder in the options page — `architecture.md`.
- Versions (C13 in `second-brain`, 2026-10-17): one SemVer version in `package.json` and `manifest.json`, `CHANGELOG.md` in English as source, tags, Releases and the attached zip made by `release.yml` on `main`; a release is its own PR on the owner's word, never a pushed tag; 4.1.0 "Egret" (birds, alphabetical) with `v1`–`v4` restated as 1.0.0–4.0.0 at their commits; the settings page shows the version — `CLAUDE.md` rule 4, `release.md`.
- The website is plain files in `docs/`, deployed by `pages.yml`, which turns Pages on itself — `release.md`.
- Workflows on Node 24 actions and `ubuntu-24.04`, named rather than `ubuntu-latest` (Ubuntu 26 from 2026-10-19) — `release.md`.
- MIT license (owner, 2026-10-17), like `tamalou`: the repository is public, and without a license nobody could reuse the code. `LICENSE` ships in the release zip (`FILES` in `scripts/build.sh`), since MIT asks for the notice in every copy — `release.md`.
- Topic memory lives in `memory/`, not `docs/memory/`, because `docs/` is published whole by `pages.yml` — `CLAUDE.md` rule 2.

## Open items

- 2026-10-17 — The owner runs `bin/registry-setup.sh metube-extension` in `second-brain` (from his machine, `gh` logged in) so `registry.yml`'s `send` job can report; until then it says so and stays green. Then he re-runs the `Registry` workflow on the merge commit that brought this scaffold, so its block ticks the fiche's box.
- 2026-10-17 — The backfilled releases v1.0.0–v4.0.0 wait on `second-brain`'s "Backfill releases" workflow, run once by the owner with his token; the next push to `main` (or a "Run workflow" of Release) then attaches their zips. Whether to delete the older `v1`–`v4` Releases afterwards is his call.
- 2026-10-17 — Not in the Chrome Web Store: installation is a release zip loaded unpacked. Publishing there (fees, listing, review) is the owner's call; `scripts/build.sh` already produces an uploadable zip.

## Topic files

| file | read when |
| --- | --- |
| `memory/architecture.md` | touching the service worker, the permissions, the auth rule, the menus, the vendored player, the layout of the code |
| `memory/metube.md` | touching a MeTube request, the overlay's lookup, deleting, subtitles, URL normalisation |
| `memory/release.md` | touching CI, `scripts/build.sh`, releases, the website's deployment |
| `memory/testing.md` | checking a change in a real browser, the unit tests' scope |
