# MeTube's behaviour

What MeTube (and yt-dlp behind it) does that the extension has to live with. Read before touching a request, the overlay's lookup, deleting, subtitles or how links are cleaned. The user-facing side of most of these is in the README ("MeTube server setup", "How MeTube treats some links", "Troubleshooting").

## Requests (2026-09-29)

- `/add` options follow what MeTube's current validation accepts, e.g. M4A offers only best, 192 and 128 (#1); the catalogue is `lib/config.js`. Subtitles-only downloads are `download_type: "captions"`, one request per language, `subtitle_mode: "prefer_manual"` (hand-made subtitles when they exist, automatic ones otherwise) (#5).
- Subtitle language codes follow MeTube's rule `^[A-Za-z0-9][A-Za-z0-9-]{0,34}$` (#5).
- **Errors**: 401 bad credentials; 400 carries MeTube's reason, which **under HTTP/2 is in the body, not `statusText`** (HTTP/2 has no reason phrase); 404 wrong base URL or path prefix; a non-JSON answer means something else answered (a login page from Authelia or Authentik, a proxy error). Once an error applies to the whole batch (auth, network, permission), the remaining URLs are not attempted (#1).
- `/version` is the connection test: it reports MeTube's and yt-dlp's versions.

## Links (2026-09-29)

- YouTube links keep only `v`, `list` and `t`; `youtu.be`, `m.`, `/live/` and `/embed/` become `watch?v=`. Account-bound lists (`WL`, `LL`, `LM`) are dropped: MeTube has no YouTube login. Other sites pass unchanged: MeTube supports whatever yt-dlp does (#1).
- **`t=` makes a clip**: current MeTube turns `t` into a start time, so `t=90` downloads from 1:30. Kept on purpose for a page sent as it is; the overlay sends the bare video ID instead (#1, #4).
- `watch?v=…&list=…` may fetch the whole playlist, depending on MeTube's strict playlist mode; the popup tags such links "In playlist".

## The overlay's lookup (2026-09-29)

- Found in `/history` **by video ID, not full URL** (MeTube stores whatever URL was sent). A finished download plays after a one-byte probe of its file, which turns a 401 or 404 into a clear message instead of a silent `<video>` error. Audio-only downloads play from `audio_download/`, like MeTube's own UI (#4).
- **`preferActive`**: after the overlay (re-)adds a video, lookups rank the in-progress entry first. MeTube keeps the old `done` entry until the new download finishes, so without it "Download again" looped back to the 404 (#4).
- **One history entry per video URL**: downloading the audio or the subtitles of an already-downloaded video replaces its entry (the file stays on disk), and the player no longer finds the video. Documented, not worked around (#5).
- **Plain-HTTP MeTube cannot play inside YouTube**: Chrome treats `http://` video in an HTTPS page as mixed content and upgrades it. The overlay says so up front; loopback is exempt (#4).
- Subtitles are fetched by the service worker as `<file stem>.<lang>.vtt` for each configured language; only real WebVTT is kept, attached as a blob-URL `<track>`. They exist only if MeTube runs with `YTDL_OPTIONS` asking yt-dlp to write them (#4).

## Deleting (2026-09-29)

- `overlay:delete` re-reads `/history` rather than trusting the page, calls `POST /delete` with `{ids: [item.url], where: "done", delete_files: true}`, then probes the file URL to tell whether it is really gone (#5).
- **MeTube erases files only with `DELETE_FILE_ON_TRASHCAN=ask` or `true`**; by default it removes the entry and keeps the file, and the player says so.
- Nothing is deleted without a click: the confirmation focuses Cancel (Enter never deletes), and the end screen ("Delete from MeTube", "Watch again", "Keep and close", on by default, a setting) counts as the confirmation.
