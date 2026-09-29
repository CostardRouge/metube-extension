# MeTube Sender

A Chrome extension (Manifest V3) that sends YouTube videos, shorts and playlists to your self-hosted
[MeTube](https://github.com/alexta69/metube) instance. It works in Chrome and in Arc.

It's plain JavaScript, HTML and CSS: no build step, no dependencies. Load the folder as-is.

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

When you click **Save**, the browser asks for permission to access your MeTube host. Click
**Allow**: without it the extension can't reach MeTube. Then click **Test connection**. It calls
`/version` and shows the MeTube and yt-dlp versions it finds.

All settings, including the password, are stored in this browser's extension storage
(`chrome.storage.local`). They are never sent anywhere except to your MeTube host.

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

## Permissions

| Permission | Why |
| --- | --- |
| `contextMenus` | The right-click menus. |
| `storage` | Saving settings, and remembering the last error for the popup. |
| `scripting` + `activeTab` | Reading links from the current tab, only after you open the popup or use a menu item. |
| `notifications` | Result notifications, when the browser shows them. |
| `https://*.youtube.com/*` | Scanning YouTube pages for links. |
| Your MeTube host (optional, requested on Save) | Sending requests to MeTube. Every network call is made by the background service worker, never by the pages you visit. |

## Development

```
manifest.json
background.js          service worker: menus, messages, all MeTube requests, badge/notifications
lib/config.js          settings, defaults, format/quality catalog
lib/metube.js          MeTube API client (/add, /version) and error mapping
lib/youtube.js         YouTube URL detection and normalization
popup/                 toolbar popup (page scan + send)
options/               settings page
ui/base.css            shared dark theme
icons/                 icon.svg source and PNG sizes
tests/                 unit tests for URL handling and the manifest
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
