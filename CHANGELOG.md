# Changelog

What each release of MeTube Sender brings to the people who use it. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html); `.github/workflows/release.yml` turns each section into a
tag and a GitHub Release once it reaches `main`, with the extension's zip attached (COMMON-PROJECT-SPEC C13). Written
in English, like the code, though the extension also speaks French. Codenames are birds, in alphabetical order.

1.0.0 to 4.0.0 were added after the fact. They are the four releases first published as `v1` to `v4`, with Chrome's
one-number versions: the same commits and the same numbers Chrome showed (`4` is `4.0.0` to Chrome).

## [Unreleased]

### Added

- The website carries its full icon set and a web manifest: saved to a phone's home screen, it shows the MeTube
  Sender icon instead of a screenshot of the page.
- The website ends with a legal notice: who publishes it, who hosts it, what it measures (nothing) and under which
  licences the extension and the page are published.
- The website publishes an `llms.txt`: a plain-text summary of the extension, how to install it and the permissions
  it asks, with links to each section of the site, the releases and the source, for AI assistants and search tools.

### Changed

- The website serves its font itself instead of loading it from Google Fonts: opening the page no longer contacts a
  third party.

## [4.1.0] - 2026-10-17 — Egret

### Added

- The settings page shows the version you are running, so you can tell which release is loaded.
- The extension is open source under the MIT license, and the license ships in the release zip.

### Fixed

- Opening the player no longer makes Chrome log a warning about fullscreen on the YouTube page.

## [4.0.0] - 2026-10-01 — Dove
<!-- commit: 6d99e18a656b65afe067ecef51bd987705c3f3f7 -->

### Added

- A French version: menus, popup, settings, player, notifications and errors follow the browser's language, French or
  English, with numbers, sizes and subtitle language names written the French way.
- Double-click the picture in the player to enter or leave fullscreen, like on YouTube.
- A website, in English and French, with the install guide for Chrome and Arc, the documentation, the MeTube server
  setup and an animated demo: <https://costardrouge.github.io/metube-extension/>.

## [3.0.0] - 2026-09-30 — Cardinal
<!-- commit: 8299f43169c02cb0f4a949deb61afcba2b967b60 -->

### Added

- A right-click menu you can shape: one MeTube entry with video qualities, audio formats and subtitle-only downloads,
  in three layouts (defaults in one click with the rest under "More…", flat, or one submenu per block), previewed live
  in the settings.
- A menu on the extension's icon: play here, download the tab's video, audio or subtitles, open MeTube, settings.
- Delete a download from the player, with the trash button or the Delete key, after a confirmation.
- An end screen when a video finishes: delete it, watch it again, or keep it.

## [2.0.0] - 2026-09-29 — Bluebird
<!-- commit: c0671a645c3e5152a0cd5be91998e99a794ae912 -->

### Added

- Watch MeTube's copy right on YouTube: Alt+Shift+M, or Play in the popup, opens a player over the video page. It
  resumes where you were, shows the progress of a download still running, and adds the video to MeTube if it is not
  there yet.
- The player has speeds from 0.5× to 2×, subtitles, picture-in-picture, fullscreen and keyboard shortcuts.
- A setting for the subtitle languages the player looks for.

## [1.0.0] - 2026-09-29 — Albatross
<!-- commit: e48d717c64d2d22e64ffec394b83c785d2d14205 -->

### Added

- Send YouTube videos, shorts and playlists to your self-hosted MeTube from the right-click menu: a link, the YouTube
  links in a selection, or the page, with an "Audio only" choice.
- A popup that lists the YouTube videos on the current tab, to tick and send in one go.
- A settings page: your MeTube's address, its login if it sits behind basic auth, the default type, format, quality
  and folder, and a button to test the connection.
- A badge and optional notifications say whether a send worked, with a clear reason when it did not.
- Works in Chrome and Arc, installed from the release zip.
