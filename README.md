# MeTube Sender

A Chrome extension (Manifest V3) that sends YouTube videos, shorts and playlists to your self-hosted
[MeTube](https://github.com/alexta69/metube) instance, and plays MeTube's downloads in an overlay
on top of YouTube. It works in Chrome and in Arc.

It's plain JavaScript, HTML and CSS with no build step: load the folder as-is. Its one library,
[Media Chrome](https://github.com/muxinc/media-chrome) for the player, is included in `vendor/`
(Manifest V3 doesn't allow loading code from the internet).

**Website (English and French):** <https://costardrouge.github.io/metube-extension/>

## Features

- **Right-click menu** (one **MeTube** entry): download what you right-clicked on in the quality
  you pick. See [Right-click menu](#right-click-menu).
  - What gets sent: a link, the page (or a YouTube player embedded in it), or every YouTube link
    in a text selection, both `<a>` links and URLs written out as plain text, without duplicates.
  - Three blocks: **video** qualities, **audio** formats, and **subtitles** (subtitle files only,
    one per language). You choose the entries and the layout in the settings.
  - **MeTube settings…** and **Open MeTube** at the top, **Play here with MeTube** at the bottom.
- **Extension icon menu**: right-click the toolbar icon to play, download (video, audio,
  subtitles) or open MeTube for the current tab, or reach the settings.
- **Popup** (toolbar button): lists the YouTube videos, shorts and playlists linked from the current
  page, including embedded players. It shows their titles, and you tick the ones to send
  (**All**/**None**, or shift-click to select a range). **Send page** sends the page you're on. The
  **Audio only (m4a)** toggle applies to both buttons.
- **Feedback**: the toolbar badge shows how many links were sent. A red **!** means something
  failed; open the popup to see why. When the browser displays notifications, you also get one.
- **Clean URLs**: YouTube links are cut down to `v`, `list` and `t`, so tracking parameters such
  as `si`, `pp`, `feature` and `index` are removed. `youtu.be/…`, `m.youtube.com`, `/live/…` and
  `/embed/…` links become the standard `https://www.youtube.com/watch?v=…` form. Links from other
  sites are sent unchanged, since MeTube supports everything yt-dlp does.
- **Player on YouTube**: on a video page, press **Alt+Shift+M** (or **Play** in the popup) to watch
  the video from MeTube in an overlay, then delete it from MeTube once watched. See
  [Player on YouTube](#player-on-youtube).
- **English and French**: the extension follows the browser's language. See [Languages](#languages).

## Install

First, download `metube-sender-<version>.zip` from the latest
[release](https://github.com/CostardRouge/metube-extension/releases/latest) and unzip it into a
folder you'll keep. To run the unreleased code instead, clone this repository.

### Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the folder that contains `manifest.json`.
4. The settings page opens. Configure it as described in [Configure](#configure).
5. Optional: click the puzzle icon in the toolbar and pin **MeTube Sender** so its badge is always
   visible.

### Arc

1. Open `arc://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the folder that contains `manifest.json`.
4. The settings page opens. To reopen it later, use the gear in the extension's popup, or go to
   `arc://extensions` → **MeTube Sender** → **Details** → **Extension options**.
5. Pin the extension (extensions menu in the sidebar / URL bar) to reach the popup and see the
   badge.

Arc usually doesn't show extension notifications. The extension still works: the badge and the
popup show every result.

### Keyboard shortcut

The player's shortcut is **Alt+Shift+M** (**Option+Shift+M** on a Mac). To change it, or to set it
if another extension already uses that key:

- Chrome: open `chrome://extensions/shortcuts` and edit **Play the current YouTube video from
  MeTube**.
- Arc: open `arc://extensions/shortcuts` and do the same.

The settings page shows the current shortcut, and its **Change shortcut** button opens that page.

### Updating

Unzip the new release into the same folder, replacing its files (or pull the new code), then
click the reload icon on the extension's card in `chrome://extensions` or `arc://extensions`.
Don't load it from a different folder: the browser would install it as a second extension,
without your settings.

## Configure

| Setting | Description |
| --- | --- |
| **MeTube URL** | e.g. `https://metube.example.com`. If MeTube runs under a path prefix (`URL_PREFIX`), include it: `https://example.com/metube`. |
| **Username / Password** | Sent as `Authorization: Basic …` with every request, e.g. for Traefik `basicAuth`. Leave both empty if MeTube isn't behind auth. |
| **Download type / Format / Quality** | Defaults for every send. Video: format Any or MP4, quality Best, 2160p … 240p or Worst. Audio: M4A, MP3 or Opus, with the qualities MeTube accepts for each format. |
| **Folder** | Optional sub-folder of MeTube's download directory. MeTube must run with `CUSTOM_DIRS=true`, plus `CREATE_CUSTOM_DIRS=true` if the folder doesn't exist yet. |
| **Right-click menu** | Layout, where it appears, and the entries of each block. See [Right-click menu](#right-click-menu). |
| **Subtitle languages** | Languages the player looks for, comma-separated (default `fr, en`). They must match the `subtitleslangs` MeTube downloads (see below). The menu's subtitles block uses the same list. |
| **When a video ends, offer to delete it** | On by default. See [Deleting a video](#deleting-a-video). |

When you click **Save**, the browser asks for permission to access your MeTube host. Click
**Allow**: without it the extension can't reach MeTube. Then click **Test connection**. It calls
`/version` and shows the MeTube and yt-dlp versions it finds.

All settings, including the password, are stored in this browser's extension storage
(`chrome.storage.local`). They are never sent anywhere except to your MeTube host.

The foot of the settings page shows the extension's version, to tell which release is loaded
(see the [changelog](CHANGELOG.md)).

## Right-click menu

Right-click a link, a page, selected text, or a YouTube video (second right-click on the player:
the first one opens YouTube's own menu, which extensions can't change). A **MeTube** entry offers,
with the default **Hybrid** layout:

```
MeTube ›  MeTube settings…
          Open MeTube
          ─────────────
          Video · 1080p · MP4                    ← your one-click choices
          Audio · M4A
          Subtitles · French + English (SRT)
          ─────────────
          More video qualities      › Best quality · MP4, 720p · MP4, 480p · MP4
          More audio formats        › MP3 · 320 kbps, Opus · best quality
          Subtitles in one language › French · SRT, English · SRT
          ─────────────
          Play here with MeTube (Alt+Shift+M)    ← on YouTube video pages
```

In the settings, under **Right-click menu**:

- **Layout**:
  - **Hybrid**: one-click entries, the rest under **More…**.
  - **Flat**: everything in the MeTube submenu, under VIDEO / AUDIO / SUBTITLES titles.
  - **Submenus**: one submenu per block.
- **Show MeTube on**: pages, links, selected text, the video player.
- **Blocks**:
  - **Video**: MP4 or any format, and which qualities, from Best to 360p.
  - **Audio**: M4A, MP3 320/192/128, Opus, FLAC, WAV.
  - **Subtitles**: SRT, VTT or TXT, one download per language of **Subtitle languages**.
  - Each block can be turned off, and has its one-click choice.
- **Other entries**: settings at the top or at the bottom, **Open MeTube**, **Play here**, and
  the extension icon's menu.

A live preview shows the result for each kind of right-click. Chrome places the MeTube entry itself
(near **Inspect**): no extension can put it at the very top of the page menu. The extension icon's
menu is the one place where its entries come first.

**Subtitle files.** The subtitles block asks MeTube for the subtitle file alone (`captions`
download): hand-made subtitles when the video has some, YouTube's automatic ones otherwise.

## Player on YouTube

On a `youtube.com/watch?v=…` page, press the shortcut or click **Play** in the popup. The overlay:

1. Pauses YouTube's player and notes where you were.
2. Looks the video up in MeTube's history, by video ID.
3. Then, depending on what it finds:
   - **Already downloaded**: plays the file. If you had watched more than 5 seconds on YouTube,
     it starts from there.
   - **Queued or downloading**: shows the progress (refreshed every 2 seconds) and starts
     playing when the download finishes.
   - **Not in MeTube**: adds it with your default options, then shows the progress.
   - **Failed in MeTube**: shows MeTube's error, with **Try again**.

The player has play/pause, seeking, volume, speed (0.5× to 2×, in the **⋯** menu),
subtitles, picture-in-picture and fullscreen. Keyboard: **Space** or **K** play/pause, **←/→**
seek 5 seconds, **F** fullscreen, **C** subtitles on/off, **M** mute, **Del** delete, **Esc** close.
Double-click the picture to enter or leave fullscreen, like on YouTube.

Esc (or the shortcut again, or a click outside the video) closes the overlay. YouTube stays paused.
The overlay also closes when you navigate to another video.

The overlay only reads the page's address and the first `<video>` element (to pause it and read
its position). It doesn't depend on YouTube's page structure, so YouTube redesigns shouldn't break
it. If there's no `<video>` on the page, the overlay still opens and plays from the beginning.

### Deleting a video

The player is for watching a video once, while YouTube streaming is out of reach. Once watched,
the file can go:

- **Trash button** (top right) or **Del**: a confirmation shows the title, quality, size and
  subtitles. **Cancel** is selected, so Enter never deletes by accident.
- **When the video ends** (unless turned off in the settings), the player asks: **Delete from
  MeTube**, **Watch again**, or **Keep and close**. Nothing is deleted without a click.

After deleting, the extension checks whether the file is really gone from the server and says so.
MeTube only erases files when it's set up for it: see below.

### MeTube server setup for the player

**Subtitles.** MeTube only writes subtitle files if yt-dlp is told to. Add this to MeTube's
environment, with the same languages as in the extension's settings:

```
YTDL_OPTIONS={"writesubtitles": true, "writeautomaticsub": true, "subtitleslangs": ["fr","en"], "subtitlesformat": "vtt"}
```

yt-dlp then saves `<video name>.<lang>.vtt` next to each video. For each configured language,
the player loads the matching file if it exists and skips it otherwise. Only videos downloaded
after this change have subtitles.

**HTTPS.** YouTube is an HTTPS page, and browsers won't load `http://` video inside it. MeTube
must be reachable over `https://`, for example through Traefik with a certificate. `localhost`
is the only exception.

**Default download URLs.** The player expects MeTube's standard file URLs:
`{MeTube URL}/download/…`, or `/audio_download/…` for audio-only downloads. If you changed
`PUBLIC_HOST_URL` to serve files from elsewhere, the player won't find them.

**Deleting files.** MeTube's default (`DELETE_FILE_ON_TRASHCAN=false`) only removes the entry
from its list and keeps the file. For the player's delete button to erase files, add:

```
DELETE_FILE_ON_TRASHCAN=ask
```

(`true` also works, but then MeTube's own trash button always erases files too.) With the
default, the player tells you the file was kept.

**One entry per video.** MeTube keeps one history entry per video URL. Downloading the audio or
the subtitles of a video that's already downloaded replaces its entry in MeTube's list (the
video file stays on disk). The player then no longer finds the video and would download it
again. For subtitles to watch with, prefer `YTDL_OPTIONS` above; use the menu's subtitles block
to get the files themselves.

**Formats.** The browser must be able to play the file. MP4 (H.264/AAC) and WebM play everywhere.
If you get *can't play this file*, set the default video format to **MP4** in the extension's
settings.

### How the video gets past basic auth

A `<video>` element can't send an `Authorization` header. The extension adds one with a
`declarativeNetRequest` rule, which it rebuilds whenever you save the settings. The rule is
limited to:

- `GET` requests for media,
- started by the extension's own player,
- to your MeTube URL.

Requests made by YouTube, or by any other site, never get your credentials. So a web page can't
use them to add or delete downloads in your MeTube. Every other request, including `/history`,
`/add` and the subtitle files, is sent by the service worker.

## How MeTube treats some links

- **`t=` timestamps**: current MeTube versions turn a `t` parameter into the start of a clip, so
  `watch?v=…&t=90` downloads from 1:30 onward. To get the whole video, send a link without `t`.
- **Videos opened from a playlist** (`watch?v=…&list=…`): the popup tags these **In playlist**.
  Whether MeTube downloads only that video or the whole playlist depends on its *strict playlist
  mode* setting (`DEFAULT_OPTION_PLAYLIST_STRICT_MODE`).
- Private lists that need your YouTube login are ignored: Watch later (`WL`), Liked videos (`LL`)
  and Liked music (`LM`).

## Troubleshooting

| Message | What to do |
| --- | --- |
| *Authentication failed (401)* | Check the username and password in the settings. |
| *Can't reach host* | The URL is wrong, the server is down, or it's unreachable from this machine (VPN, DNS, TLS certificate). |
| *Not found (404)* | The URL is missing MeTube's path prefix, or points to the wrong service. |
| *MeTube rejected the request (400): …* | MeTube refused the options; the reason comes from MeTube. Example: a folder was set but `CUSTOM_DIRS` is off. |
| *did not answer with JSON* | Something other than MeTube answered, such as a login page from Authelia or Authentik, or a proxy error page. Basic auth is the only login method this extension supports. |
| *not allowed to access …* | Open the settings and click **Save**, then **Allow**. If no prompt appears, go to the extension's **Details** page → **Site access** and add your MeTube site. |
| Popup: *Can't scan this page* | Browser pages (`chrome://`, `arc://`, the Web Store) can't be read by extensions. **Send page** still works for normal web pages. |
| Player: *MeTube couldn't download this video* | MeTube's own error is shown below it (private, age-restricted, removed…). **Try again** re-adds the video. |
| Player: *the file isn't on the server anymore* | The download was deleted from disk but is still in MeTube's history. **Download again** re-adds it. |
| Player: *won't load http:// video* | Serve MeTube over HTTPS (see [MeTube server setup](#metube-server-setup-for-the-player)). |
| Player: *can't play this file* | The browser doesn't support the file's format. Set the default video format to **MP4**. |
| Player: no subtitles | Check `YTDL_OPTIONS` (above), and that the languages match. Videos downloaded before the change have none. |
| Player: *the server kept the file* | MeTube removed the entry but not the file: run it with `DELETE_FILE_ON_TRASHCAN=ask` (see [Deleting files](#metube-server-setup-for-the-player)). |
| A menu entry is missing | Check **Right-click menu** in the settings (block turned off, quality not selected, context unchecked). Subtitles need at least one **Subtitle language**. |
| The shortcut does nothing | Another extension may use it: set a different one (see [Keyboard shortcut](#keyboard-shortcut)). It only works on `youtube.com/watch?v=…` pages. |

## Permissions

| Permission | Why |
| --- | --- |
| `contextMenus` | The right-click menus, including the extension icon's. |
| `storage` | Saving settings, and remembering the last error for the popup. |
| `scripting` + `activeTab` | Reading links from the current tab, and opening the player on it, only after you open the popup, use a menu item or press the shortcut. |
| `notifications` | Result notifications, when the browser shows them. |
| `declarativeNetRequestWithHostAccess` | The rule that adds your credentials to the player's video requests (see above). Unlike `declarativeNetRequest`, it only acts on hosts you granted, and adds no install warning. |
| `https://*.youtube.com/*` | Scanning YouTube pages for links, and opening the player there. |
| Your MeTube host (optional, requested on Save) | Sending requests to MeTube. Every network call is made by the background service worker, never by the pages you visit. |

The player page (`overlay/overlay.html`) is the only file YouTube pages can load from the extension
(`web_accessible_resources`). The shortcut is declared under `commands` in the manifest, which isn't
a permission.

## Languages

The extension is in English and French, and follows the browser's language: menus, popup,
settings, player (Media Chrome's own labels included), notifications and error messages. Numbers
and sizes are written the local way (`1.2 GB`, `1,2 Go`), and subtitle languages get their names
in that language (`French`, `Français`). A browser in any other language gets English.

- **Chrome on Windows**: Settings › Languages, **Display Google Chrome in this language**, then
  relaunch Chrome.
- **Chrome on macOS, and Arc**: they use the system language. To change it for one app only:
  System Settings › General › Language & Region › Applications.
- **Chrome on Linux**: the system locale (`LANGUAGE`/`LANG`).

The texts live in `_locales/<language>/messages.json`. To add a language, copy `_locales/en/`
to its code (`de`, `pt_BR`…) and translate the `message` values (the tests check that every
language has the same messages, placeholders and markup). Media Chrome's labels come from
`vendor/media-chrome/lang/`, loaded in `overlay/media-chrome.js`.

## Development

```
manifest.json
background.js            service worker entry: registers listeners, routes messages
sw/menus.js              right-click menus: built from the settings, click handling
sw/send.js               sending links to MeTube
sw/feedback.js           badge, notifications, last result
sw/overlay.js            opening the player; its lookup/add/probe/subtitle/delete requests
sw/auth-rule.js          declarativeNetRequest rule adding Authorization to the player's media
sw/settings.js           settings check shared by the above
lib/config.js            settings, defaults, format/quality catalog
lib/i18n.js              messages (chrome.i18n), plurals, number and language name formatting
lib/menu.js              menu settings and the chrome.contextMenus items built from them
lib/metube.js            MeTube API client (/add, /delete, /history, /version, files), errors
lib/history.js           finding a video in /history; file and subtitle URLs
lib/youtube.js           YouTube URL detection and normalization
content/overlay-host.js  injected into YouTube on demand: the overlay iframe, pause, navigation
overlay/                 the player page shown in that iframe
vendor/media-chrome/     Media Chrome 4.19.3 (MIT), unmodified ES modules, see its README
_locales/                English (default) and French messages
popup/                   toolbar popup (page scan + send + play)
options/                 settings page (menu-editor.js: the right-click menu section)
ui/base.css              shared dark theme
icons/                   icon.svg source and PNG sizes
tests/                   unit tests: URL handling, history matching, menus, messages, the manifest, the website
docs/                    the website (GitHub Pages): index.html, site.css, site.js, i18n.js, llms.txt
scripts/build.sh       packages the extension into dist/metube-sender-<version>.zip
scripts/icons.mjs      draws the website's icons into docs/ from its SVG sources (sharp, installed on the spot)
CHANGELOG.md           what each release brings; package.json holds the version (no dependencies)
.github/release.mjs    checks CHANGELOG.md against the version, makes the tags and releases
.github/workflows/     CI (tests + build), release, the website's deployment, and the project's register report
CLAUDE.md, MEMORY.md     instructions and long-term memory for coding agents (topic files in memory/)
```

Lint, run the tests (Node 22 or newer; `.nvmrc` says 24, what CI uses; no dependencies to
install — the linter is fetched by `npx`), then build the zip:

```sh
npx --yes @biomejs/biome@2.5.15 lint .   # Biome's recommended rules, see biome.json
node --test
scripts/build.sh          # version from manifest.json (the same as package.json's)
scripts/build.sh 1.2.0    # or a given version, written into the zip's manifest.json
```

The **CI** workflow runs all three on every pull request and every push to `main`. The zip it
builds is attached to the workflow run for 14 days, so you can try a change before it's released.

## Website

`docs/` holds the project's website: one page in English and French, with the install guide, the
documentation, an animated demo of the extension and a legal notice. Like the extension, it's plain HTML, CSS and
JavaScript with no build step. To preview it, serve the folder with any static server (ES modules
don't load from `file://`):

```sh
python3 -m http.server -d docs 8000   # then open http://localhost:8000/?lang=fr
```

English texts live in `docs/index.html` (`data-i18n` attributes), French ones in `docs/i18n.js`;
`tests/site.test.mjs` checks that both sets match. `docs/llms.txt` is a hand-written, plain-text
summary of the extension for AI assistants ([llmstxt.org](https://llmstxt.org)), linking the
page's sections, the releases and the repository; the same test checks its shape and that every
link it gives lands on a section, a file or a page that exists, so rename a section there too. The page's icons (`docs/*.png` and
`docs/manifest.webmanifest`) are drawn from `docs/icon.svg`, `icon-apple.svg` and
`icon-maskable.svg` by `scripts/icons.mjs` (`npm i --no-save sharp && node scripts/icons.mjs`);
after changing a source, run it and commit the PNGs — the tests check their sizes. The page's font,
Instrument Sans, is served from `docs/fonts/` (two variable woff2 files with their SIL Open Font
License), so a visit loads nothing from a font service. The **Pages** workflow deploys `docs/` whenever
it changes on `main` (its first run turns GitHub Pages on for the repository, with **GitHub
Actions** as the source). The site lives at <https://costardrouge.github.io/metube-extension/>.

## Releasing

The version lives in `package.json` (and the same in `manifest.json`, which the tests check), in
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). [`CHANGELOG.md`](CHANGELOG.md) says
what each release brings; every pull request that changes what users get adds its lines under
`## [Unreleased]`.

A release is a pull request of its own: it moves those lines under a new
`## [x.y.z] - YYYY-MM-DD — Codename` heading (a bird, in alphabetical order) and sets the same
version in `package.json` and `manifest.json`. Check it before pushing:

```sh
node .github/release.mjs check
```

Once it's merged, the **Release** workflow tags the merge commit `vx.y.z`, publishes a GitHub
release whose notes are that changelog section, then builds `metube-sender-x.y.z.zip` from the
tag and attaches it with its SHA-256 checksum. Merging a pull request that doesn't change the
version publishes nothing. On every pull request, the same workflow refuses a changelog that
disagrees with `package.json` or breaks its shape.

Don't push tags or draft releases by hand: nothing would hold them to the changelog, and a tag
pushed by hand no longer builds anything. If a run fails, fix the cause on `main`, then use **Run
workflow** on the Release workflow: it publishes what is missing and attaches the zips that are
missing, without touching what already exists.

Chrome accepts 1 to 4 numbers separated by dots, so a pre-release such as `1.2.0-beta` can't be
an extension version. The releases `v1` to `v4` came before this scheme; the changelog lists them
as 1.0.0 to 4.0.0, the same builds.

## License

[MIT](LICENSE). Media Chrome, in `vendor/media-chrome/`, keeps its own MIT license.
