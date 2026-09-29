# MeTube Sender

A Chrome extension (Manifest V3) that sends YouTube videos, shorts and playlists to your self-hosted
[MeTube](https://github.com/alexta69/metube) instance, and plays MeTube's downloads in an overlay
on top of YouTube. It works in Chrome and in Arc.

It's plain JavaScript, HTML and CSS with no build step: load the folder as-is. Its one library,
[Media Chrome](https://github.com/muxinc/media-chrome) for the player, is included in `vendor/`
(Manifest V3 doesn't allow loading code from the internet).

## Features

- **Right-click menus** (under **MeTube**):
  - on a link: **Send to MeTube**
  - on a text selection: **Send YouTube links in selection**. It sends every YouTube link inside
    the selected text, both `<a>` links and URLs written out as plain text, without duplicates.
  - on a page: **Send this page to MeTube**
  - **Audio only (m4a)** submenu: the same three actions, downloaded as M4A at best quality.
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
  the video from MeTube in an overlay. See [Player on YouTube](#player-on-youtube).

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
| **Subtitle languages** | Languages the player looks for, comma-separated (default `fr, en`). They must match the `subtitleslangs` MeTube downloads (see below). |

When you click **Save**, the browser asks for permission to access your MeTube host. Click
**Allow**: without it the extension can't reach MeTube. Then click **Test connection**. It calls
`/version` and shows the MeTube and yt-dlp versions it finds.

All settings, including the password, are stored in this browser's extension storage
(`chrome.storage.local`). They are never sent anywhere except to your MeTube host.

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
seek 5 seconds, **F** fullscreen, **C** subtitles on/off, **M** mute, **Esc** close.

Esc (or the shortcut again, or a click outside the video) closes the overlay. YouTube stays paused.
The overlay also closes when you navigate to another video.

The overlay only reads the page's address and the first `<video>` element (to pause it and read
its position). It doesn't depend on YouTube's page structure, so YouTube redesigns shouldn't break
it. If there's no `<video>` on the page, the overlay still opens and plays from the beginning.

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
| The shortcut does nothing | Another extension may use it: set a different one (see [Keyboard shortcut](#keyboard-shortcut)). It only works on `youtube.com/watch?v=…` pages. |

## Permissions

| Permission | Why |
| --- | --- |
| `contextMenus` | The right-click menus. |
| `storage` | Saving settings, and remembering the last error for the popup. |
| `scripting` + `activeTab` | Reading links from the current tab, and opening the player on it, only after you open the popup, use a menu item or press the shortcut. |
| `notifications` | Result notifications, when the browser shows them. |
| `declarativeNetRequestWithHostAccess` | The rule that adds your credentials to the player's video requests (see above). Unlike `declarativeNetRequest`, it only acts on hosts you granted, and adds no install warning. |
| `https://*.youtube.com/*` | Scanning YouTube pages for links, and opening the player there. |
| Your MeTube host (optional, requested on Save) | Sending requests to MeTube. Every network call is made by the background service worker, never by the pages you visit. |

The player page (`overlay/overlay.html`) is the only file YouTube pages can load from the extension
(`web_accessible_resources`). The shortcut is declared under `commands` in the manifest, which isn't
a permission.

## Development

```
manifest.json
background.js            service worker entry: registers listeners, routes messages
sw/menus.js              right-click menus
sw/send.js               sending links to MeTube
sw/feedback.js           badge, notifications, last result
sw/overlay.js            opening the player; its lookup/add/probe/subtitle requests
sw/auth-rule.js          declarativeNetRequest rule adding Authorization to the player's media
sw/settings.js           settings check shared by the above
lib/config.js            settings, defaults, format/quality catalog
lib/metube.js            MeTube API client (/add, /history, /version, files) and error mapping
lib/history.js           finding a video in /history; file and subtitle URLs
lib/youtube.js           YouTube URL detection and normalization
content/overlay-host.js  injected into YouTube on demand: the overlay iframe, pause, navigation
overlay/                 the player page shown in that iframe
vendor/media-chrome/     Media Chrome 4.19.3 (MIT), unmodified build, see its README
popup/                   toolbar popup (page scan + send + play)
options/                 settings page
ui/base.css              shared dark theme
icons/                   icon.svg source and PNG sizes
tests/                   unit tests: URL handling, history matching, the manifest
scripts/build.sh       packages the extension into dist/metube-sender-<version>.zip
.github/workflows/     CI (tests + build) and release
```

Run the tests (Node 22+, no dependencies to install), then build the zip:

```sh
node --test
scripts/build.sh          # version from manifest.json
scripts/build.sh 1.2.0    # or a given version, written into the zip's manifest.json
```

The **CI** workflow runs both on every pull request and every push to `main`. The zip it builds
is attached to the workflow run for 14 days, so you can try a change before it's released.

## Releasing

Releases are only created from a version tag; pushing to `main` never publishes one. Tag a
commit on `main` and push the tag:

```sh
git checkout main && git pull
git tag v1.1.0
git push origin v1.1.0
```

The tag is the version: `v1.1.0` and `1.1.0` both release version `1.1.0`. Chrome accepts 1 to 4
numbers separated by dots (`1`, `1.1`, `1.1.0`, `1.1.0.2`). Give each release a higher version
than the previous one; the Chrome Web Store, for one, refuses a version that isn't higher.

The **Release** workflow then checks that the tag is on `main`, runs the tests, builds
`metube-sender-1.1.0.zip` with that version written into its `manifest.json`, and publishes a
GitHub release with the zip, its SHA-256 checksum, install steps and notes generated from the
merged pull requests. The `version` in the repository's `manifest.json` is only used when you
load a clone unpacked or run `scripts/build.sh` without a version.

If the workflow fails (for example, the tag isn't a valid version), nothing is published. The
error is shown in the run's summary. Delete the tag
(`git push --delete origin v1.1.0 && git tag -d v1.1.0`), fix the problem, and tag again.

You can also write the release yourself on GitHub (**Releases → Draft a new release**, with a new
tag on `main`). Publishing it creates the tag, which starts the same workflow: it attaches the
zip and keeps your notes. If the workflow fails, the release stays published without the zip.
