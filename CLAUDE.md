# Instructions for LLM agents (Claude Code, Codex, Cursor, etc.)

Agents read this file at the start of every session. These rules override the agent's default behaviour and apply for the whole session, not only the first turn. They are cut from `COMMON-PROJECT-SPEC.md` in the private `second-brain` repository (profile **site**: no server state of its own, nothing to migrate; what ships is a zip released from a tag, and a static website).

## Context

- **MeTube Sender** (`costardrouge/metube-extension`) — a Chrome extension (Manifest V3) that sends YouTube videos, shorts and playlists to the owner's self-hosted [MeTube](https://github.com/alexta69/metube), and plays MeTube's downloads in an overlay on top of YouTube. It runs in Chrome and in Arc, loaded unpacked. The `README.md` is the user documentation and the file map; `docs/` is the project website, published on GitHub Pages at https://costardrouge.github.io/metube-extension/.
- **Owner**: Steeve Pommier (GitHub `CostardRouge`). He writes in **French**: answer in French. He wants results (a demo, a screen, green tests), not implementation walkthroughs. He does not write code: every line here is written by an agent from his prompts; he decides, reviews and tests by hand, in Chrome and Arc against his own MeTube.
- **Stack**: plain JavaScript (ES modules), HTML and CSS, **no build step and no dependencies**: the folder loads as it is. The one library, Media Chrome, is vendored in `vendor/media-chrome/` because Manifest V3 forbids loading code from the network. Tests are Node's own runner (`node --test`, `tests/*.test.mjs`), Node 22 or newer, CI on 24.
- **Commands that exist today**: `node --test` (unit tests: URL handling, history matching, menus, messages, the manifest, the website), `scripts/build.sh [version]` (packages `dist/metube-sender-<version>.zip`, the version written into the zip's `manifest.json` only), `python3 -m http.server -d docs 8000` (previews the website; ES modules do not load from `file://`). There is no linter and no formatter. **The gate is `node --test` then `scripts/build.sh`**, exactly what CI runs.
- **CI and delivery**: `ci.yml` runs the gate on every pull request and every push to `main` and keeps the zip as a 14-day run artifact; `release.yml` publishes a GitHub release only from a version tag on `main` (the tag is the version); `pages.yml` deploys `docs/` when it changes on `main`; `registry.yml` reports the project's state (rule 3).
- **This repository is PUBLIC** (measured 2026-10-17). So rule 3's public-repo restriction applies: a Registry block carries only `Project:`, ticked boxes and one `Log:` line — never a `Last point:` nor an open box. `registry.yml` reads the visibility itself, so nothing here needs changing if the repo goes private.
- Several agent sessions may run **in parallel** on this repo. Git history must stay readable: **one commit = one task**.
- **Local sessions: never `git push`** — the developer tests locally and pushes himself. **Cloud / web sessions (ephemeral container): push the working branch and open a pull request**, it is the only way the code gets out. Never push to `main` either way, and never push a tag: a tag is a release, and releasing is the owner's call.

## Rule 1 — Automatic commit at the end of every task (MANDATORY)

As soon as a task requested by the user is finished (feature, fix, refactor, content…), the agent MUST create a commit before handing back. No need to ask permission: it is the expected behaviour.

### Exact procedure

1. **Check the state**: `git status --porcelain` and `git diff --stat`.
2. **Select only the task's files**:
   - Stage file by file with `git add <path>` (never `git add -A`, `git add .` or `git commit -a`).
   - A modified file unrelated to the task (parallel session, tooling noise) stays **unstaged**. Do not touch it, stash it or reset it.
   - If one file holds changes from this task AND another, prefer `git add -p <file>` to stage only the relevant hunks. If inextricable, stage the whole file and say so in the commit body ("also contains …").
   - Never stage: `.env` and any secret file, `.idea/`, `.vscode/`, `dist/`, `node_modules/`, `.DS_Store` — unless the task is explicitly about them. If one of these turns out to be *tracked*, say so: it must be untracked and gitignored, not carefully avoided at every commit.
   - Check with `git diff --cached --stat` before committing.
3. **Commit with a readable message** (format below). Always use a HEREDOC to keep title + body, and end it with the attribution trailer(s) your harness asks for:

   ```bash
   git commit -m "$(cat <<'EOF'
   Imperative title, ≤ 72 characters, no trailing period

   Why this change, what it does concretely, non-obvious decisions.
   One line per idea. Mention the files/areas touched if useful.

   Co-Authored-By: …
   EOF
   )"
   ```

4. **Push only from a cloud session** (see Context). End the reply with a recap: short hash + commit title + the list of files that were modified but deliberately **left uncommitted**, if any.
5. If a git hook changes or refuses something: read the output, fix, recommit. Never `--no-verify`.

### Commit message format

- **Title**: English imperative, clear sentence, ≤ 72 chars, **no `feat:`-style prefix**, no trailing period. Example: `Take the release version from the tag`.
- **Blank line**, then a **body**, mandatory whenever the title is not enough: the *why*, the *how* in 2–6 lines, the trade-offs, what remains to do.
- A commit **never** mixes two tasks. If a session handles several distinct tasks, make several successive commits.
- No empty commit, no "WIP" commit, no commit for an unfinished task. If the task is interrupted, leave the work uncommitted and say so.

### When is a task "finished"?

- The requested code is written **and** the gate is green: `node --test` passes and `scripts/build.sh` builds the zip. A change to what the browser shows (popup, settings page, menus, the overlay player, the website) also gets looked at: Chromium is in the cloud container (`/opt/pw-browsers`); drive it with Playwright, the extension loaded unpacked (`--load-extension`) against small fake YouTube and MeTube servers, in English and in French (`--lang=fr`). See `memory/testing.md`.
- A plain question, an exploration or an explanation produces **no** commit (nothing to commit).

## Rule 2 — Project memory in `MEMORY.md` + `memory/` (MANDATORY)

The repo carries its own long-term memory, read locally and in the cloud alike:

- **`MEMORY.md`** at the root — the **index**, imported below and therefore loaded every session: how to maintain the memory, how the maintainer works, direction and decisions at a glance, open items, and a table of topic files.
- **`memory/<topic>.md`** — one file per area, loaded **on demand**. Not imported here on purpose: the split keeps the per-session prompt small. (Not `docs/memory/` as in the other repositories: `docs/` is the website, published as a whole by `pages.yml`.)

Obligations:

- **Read `MEMORY.md`, then the topic file(s) for the area you are about to touch, before acting** — to understand previous choices and not re-propose what was rejected. The table at the bottom of `MEMORY.md` maps areas to files.
- **Every task writes to memory by default.** At the end of each task, ask: "what should a future agent know that is neither in the code nor in `git log`?" — decisions and their reasons, rejected options, traps and remedies, working preferences. Write it in the matching topic file (update the existing entry first; delete what became false; add a short dated *decision → why → how to apply* entry otherwise), and update the index if a cross-cutting decision, an open item or a new topic file is involved. **If, exceptionally, there is nothing worth keeping, say so explicitly in the final message** ("no memory update: …") — silence is not an option.
- A user-visible feature is unfinished until the `README.md` says what it does (and the website, when it documents that part).
- The memory update is part of the task: it is staged **in the same commit** (rule 1).
- Memory is written in **English**, dense and factual; no session narration, no duplication of what the code, `git log`, the README or this file already say; each fact stated once, cross-referenced by file name elsewhere.
- The project command `/memorize` (`.claude/commands/memorize.md`) does this consolidation on demand over a whole conversation.

@MEMORY.md

## Rule 3 — Report the project's state (MANDATORY)

The register of what is open is the private `second-brain` repository: one
folder per project, filed by group and domain and found by its slug (`metube-extension`
here), whose `README.md` carries a typed front matter (`state`, `point`,
`repos`) and a `## To do` list of checkboxes. `PROJECTS.md` at its root is
GENERATED from those folders. That register is the source of truth — not this
conversation, not Claude's memory, not `git log`, which records what changed
and never what state the project is in.

A session that changes code here changes this project's state, and the state
reaches the register **through this repository: never touch `second-brain`**.
Do not attach it (`add_repo`), do not clone it, do not commit to it — locally
either, even though it sits beside this checkout. On every push to `main`,
`.github/workflows/registry.yml` reads the block below from the merged pull
request's description (or, when there is none, from the pushed commits'
messages) and sends it to `second-brain`, whose own workflow updates the fiche
and regenerates `PROJECTS.md`. Only what reaches `main` is reported.

Write the block in a cloud session in this repository's pull request
description, **inside an HTML comment** so the rendered pull request stays
clean and its French does not mix with an English description. The labels are
English, what follows them is French:

    <!-- Registry
    Project: metube-extension
    Last point: <the project as it now stands, in French>
    - [x] <an existing box this work closes, copied from the fiche>
    - [ ] <a new open action, in French>
    Log: <one line for the fiche's log, in French>
    -->

In a local session, write the same lines at the end of the task's commit body,
after a line `Registry:`.

Every line but the first is optional. `Last point:` REPLACES the fiche's
paragraph: write what someone back after three months needs about the whole
project, not a changelog — the commit body already carries the detail. A
`- [x]` ticks a box only when its text matches one; copy it from the fiche
when you can read it (locally `../second-brain`, or through GitHub when the
session already has it — never attach it just to read it), otherwise leave the
ticking to the maintainer. A new box is one gesture, not a plan. The date is
the merge's, and `state:` is never written by a block: it is the
maintainer's call.

**Hidden is not private.** The API hands a pull request's description and a
commit's message to anyone who can read the repository. In a **public**
repository the block carries only what is already public: the `Project:` line,
ticked boxes (`- [x]`) and one `Log:` line — never a `Last point:`, never an
open box, nothing else. The `check` job of `registry.yml` checks every pull
request before it is merged: it fails on a malformed block, on a block left
visible under a heading, and, in a public repository, on any other line; and
the report strips such a line if it is merged anyway.

A change a returning reader does not need — tooling, a typo, a refactor —
carries no block. A question, an exploration or an explanation changes no
state and writes no block.

## Verification — trust the disk, not the context

- A tool answering "success" is not proof. Before saying a change is done, prove it through the repo: `git status --porcelain`, `git diff`, `grep` for the expected value, `git show HEAD:<file>` compared to the file on disk.
- What you hold in context (an earlier `Read`, an old `ls`, a summarised conversation) can be **stale**. Signature: `git status` clean right after an announced change. Re-read from disk before concluding.
- Never state an absence ("this feature is missing", "that file does not exist") without a `git`/`grep` check made in the current turn.
- What automation cannot reach is said, not assumed: the real permission prompt, a native browser shortcut press, Arc itself. Name it in the pull request as untested.

## Other rules

- Never rewrite history (`rebase -i`, `commit --amend`, `reset --hard`, `push --force`, `filter-repo`) without an explicit request. Do not modify `.git/config`, the hooks or branch settings.
- **No build step, no runtime dependency, no remote code.** Everything the browser runs is in the repository. A new library is vendored unmodified with its license and version (`vendor/<name>/README.md` says how to update it); a `package.json` would only be added for tooling that never ships.
- **Every network call to MeTube is made by the service worker** (`lib/metube.js`, through `sw/`), never by the pages the user visits. The one exception is the player's `<video>`, whose credentials come from the `declarativeNetRequest` rule in `sw/auth-rule.js`, scoped to `GET` media requests started by the extension to the configured MeTube URL. Never widen that rule: YouTube must never get the user's credentials.
- **Logic that can be pure is pure** and lives in `lib/` with a unit test (`lib/menu.js`, `lib/history.js`, `lib/youtube.js` take no `chrome.*` call); `sw/`, `popup/`, `options/`, `overlay/` and `content/` adapt it to the browser.
- **The YouTube page is touched as little as possible**: `content/overlay-host.js` reads the address and the first `<video>`, nothing of YouTube's markup, so a YouTube redesign does not break the extension. Keep it that way.
- **Permissions are a promise.** Adding one, or a host, changes the install prompt and the README's permissions table; prefer the narrower variant (`activeTab`, optional host permissions requested on Save, `declarativeNetRequestWithHostAccess`).
- **User-facing text goes through `chrome.i18n`**: every message in `_locales/en/messages.json` and `_locales/fr/messages.json` (the tests check keys, placeholders and markup match, and that every message is used). English is the default and the source; French uses no-break spaces before `: ; ? !` and inside `« »`. The website's English lives in `docs/index.html`, its French in `docs/i18n.js` (`tests/site.test.mjs`). Code, identifiers, commits and memory are English.
- **A new top-level file or folder the extension loads goes into `FILES` in `scripts/build.sh`**, or the released zip silently lacks it; `tests/manifest.test.mjs` checks the folders it knows.

## Related files

- `AGENTS.md`: a symlink to this file, for tools that do not read `CLAUDE.md`.
- `MEMORY.md` + `memory/`: project long-term memory (rule 2).
- `README.md`: the user documentation, the file map, development and release procedures.
