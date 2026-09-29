// The right-click menus: their settings, and the chrome.contextMenus items
// built from them. Pure functions (no chrome.* calls), shared by the service
// worker, the options page preview and the tests.

export const VIDEO_CHOICES = [
  { key: 'best', label: 'Best quality', short: 'Best' },
  { key: '2160', label: '2160p (4K)', short: '2160p' },
  { key: '1440', label: '1440p', short: '1440p' },
  { key: '1080', label: '1080p', short: '1080p' },
  { key: '720', label: '720p', short: '720p' },
  { key: '480', label: '480p', short: '480p' },
  { key: '360', label: '360p', short: '360p' },
];

// Format/quality pairs MeTube's /add accepts for audio.
export const AUDIO_CHOICES = [
  { key: 'm4a', format: 'm4a', quality: 'best', label: 'M4A · best quality', short: 'M4A' },
  { key: 'm4a-192', format: 'm4a', quality: '192', label: 'M4A · 192 kbps', short: 'M4A 192' },
  { key: 'mp3-320', format: 'mp3', quality: '320', label: 'MP3 · 320 kbps', short: 'MP3 320' },
  { key: 'mp3-192', format: 'mp3', quality: '192', label: 'MP3 · 192 kbps', short: 'MP3 192' },
  { key: 'mp3-128', format: 'mp3', quality: '128', label: 'MP3 · 128 kbps', short: 'MP3 128' },
  { key: 'opus', format: 'opus', quality: 'best', label: 'Opus · best quality', short: 'Opus' },
  { key: 'flac', format: 'flac', quality: 'best', label: 'FLAC · lossless', short: 'FLAC' },
  { key: 'wav', format: 'wav', quality: 'best', label: 'WAV · uncompressed', short: 'WAV' },
];

export const VIDEO_FORMATS = [
  { key: 'mp4', label: 'MP4' },
  { key: 'any', label: 'Any format' },
];

export const SUBTITLE_FORMATS = [
  { key: 'srt', label: 'SRT' },
  { key: 'vtt', label: 'VTT' },
  { key: 'txt', label: 'TXT' },
];

export const LAYOUTS = [
  { key: 'hybrid', label: 'Hybrid', help: 'Your defaults in one click; the other choices under “More…”.' },
  { key: 'flat', label: 'Flat', help: 'Everything in one submenu, under section titles: one hover, one click.' },
  { key: 'submenus', label: 'Submenus', help: 'One submenu per block: a short menu, every choice one level down.' },
];

// chrome.contextMenus contexts where the MeTube menu can appear.
export const CONTEXTS = [
  { key: 'page', label: 'Pages' },
  { key: 'link', label: 'Links' },
  { key: 'selection', label: 'Selected text' },
  { key: 'video', label: 'Video player (2nd right-click on YouTube)' },
];

export const MENU_DEFAULTS = Object.freeze({
  layout: 'hybrid',
  contexts: { page: true, link: true, selection: true, video: true },
  video: { enabled: true, qualities: ['best', '1080', '720', '480'], format: 'mp4', oneClick: '1080' },
  audio: { enabled: true, choices: ['m4a', 'mp3-320', 'opus'], oneClick: 'm4a' },
  subtitles: { enabled: true, format: 'srt' },
  settingsFirst: true,
  openMetube: true,
  player: true,
  // Entries in the extension icon's own right-click menu.
  toolbar: true,
});

const WATCH_PAGES = ['https://www.youtube.com/watch*', 'https://m.youtube.com/watch*'];
// Chrome's limit for top-level items in the extension icon's menu.
export const TOOLBAR_LIMIT = 6;

const keysOf = (list) => list.map((item) => item.key);
const bool = (value, fallback) => (typeof value === 'boolean' ? value : fallback);
const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
// Keep the catalog's order; a missing list falls back to the default.
const pickList = (list, allowed, fallback) =>
  Array.isArray(list) ? allowed.filter((key) => list.includes(key)) : [...fallback];

/** A complete, valid menu settings object, whatever was stored. */
export function normalizeMenu(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const D = MENU_DEFAULTS;
  const qualities = pickList(r.video?.qualities, keysOf(VIDEO_CHOICES), D.video.qualities);
  const choices = pickList(r.audio?.choices, keysOf(AUDIO_CHOICES), D.audio.choices);
  const oneClick = (value, list, fallback) => pick(value, list, list.includes(fallback) ? fallback : (list[0] ?? null));
  return {
    layout: pick(r.layout, keysOf(LAYOUTS), D.layout),
    contexts: Object.fromEntries(CONTEXTS.map(({ key }) => [key, bool(r.contexts?.[key], D.contexts[key])])),
    video: {
      enabled: bool(r.video?.enabled, D.video.enabled),
      qualities,
      format: pick(r.video?.format, keysOf(VIDEO_FORMATS), D.video.format),
      oneClick: oneClick(r.video?.oneClick, qualities, D.video.oneClick),
    },
    audio: {
      enabled: bool(r.audio?.enabled, D.audio.enabled),
      choices,
      oneClick: oneClick(r.audio?.oneClick, choices, D.audio.oneClick),
    },
    subtitles: {
      enabled: bool(r.subtitles?.enabled, D.subtitles.enabled),
      format: pick(r.subtitles?.format, keysOf(SUBTITLE_FORMATS), D.subtitles.format),
    },
    settingsFirst: bool(r.settingsFirst, D.settingsFirst),
    openMetube: bool(r.openMetube, D.openMetube),
    player: bool(r.player, D.player),
    toolbar: bool(r.toolbar, D.toolbar),
  };
}

/** "fr" → "French" (the extension's UI is in English). */
export function languageName(lang) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(lang) ?? lang;
  } catch {
    return lang;
  }
}

function titles(menu, langs) {
  const mp4 = menu.video.format === 'mp4' ? ' · MP4' : '';
  const subFormat = SUBTITLE_FORMATS.find((f) => f.key === menu.subtitles.format).label;
  const names = langs.map(languageName);
  return {
    video: (choice) => `${choice.label}${mp4}`,
    audio: (choice) => choice.label,
    lang: (lang) => `${languageName(lang)} · ${subFormat}`,
    allLangs: `${names.join(' + ')} (${subFormat})`,
  };
}

/**
 * The items to pass to chrome.contextMenus.create(), in order.
 * Item ids encode the action: "video:1080", "audio:mp3-320", "subs:fr",
 * "subs:*" (every language), "play", "open", "settings"; the extension icon's
 * entries carry a "tb|" prefix. Other ids are structural.
 * @param {ReturnType<typeof normalizeMenu>} menu
 * @param {{langs?: string[], shortcut?: string}} [options]
 *   langs: subtitle languages (the "Subtitle languages" setting);
 *   shortcut: the player's keyboard shortcut, shown in its entry.
 */
export function buildMenuItems(menu, { langs = [], shortcut = '' } = {}) {
  const t = titles(menu, langs);
  const video = menu.video.enabled ? VIDEO_CHOICES.filter((c) => menu.video.qualities.includes(c.key)) : [];
  const audio = menu.audio.enabled ? AUDIO_CHOICES.filter((c) => menu.audio.choices.includes(c.key)) : [];
  const subLangs = menu.subtitles.enabled ? langs : [];
  const videoDefault = video.find((c) => c.key === menu.video.oneClick) ?? video[0];
  const audioDefault = audio.find((c) => c.key === menu.audio.oneClick) ?? audio[0];
  const playTitle = `Play here with MeTube${shortcut ? ` (${shortcut})` : ''}`;
  const subsAll = subLangs.length === 1 ? `subs:${subLangs[0]}` : 'subs:*';

  const items = [];
  const contexts = CONTEXTS.map((c) => c.key).filter((key) => menu.contexts[key]);

  if (contexts.length) {
    const children = [];
    let separators = 0;
    const item = (id, title, extra = {}) => children.push({ id, title, parentId: 'root', contexts, ...extra });
    const sep = (parentId = 'root', ctx = contexts) =>
      children.push({ id: `sep-${++separators}`, type: 'separator', parentId, contexts: ctx });
    const child = (parentId, id, title) => children.push({ id, title, parentId, contexts });

    if (menu.contexts.selection) {
      item('hdr-selection', 'FOR EACH YOUTUBE LINK IN THE SELECTION', { enabled: false, contexts: ['selection'] });
      sep('root', ['selection']);
    }
    if (menu.settingsFirst) {
      item('settings', 'MeTube settings…');
      if (menu.openMetube) item('open', 'Open MeTube');
      sep();
    }

    if (menu.layout === 'hybrid') {
      if (videoDefault) item(`video:${videoDefault.key}`, `Video · ${t.video(videoDefault)}`);
      if (audioDefault) item(`audio:${audioDefault.key}`, `Audio · ${audioDefault.short}`);
      if (subLangs.length) item(subsAll, `Subtitles · ${t.allLangs}`);
      sep();
      const otherVideo = video.filter((c) => c !== videoDefault);
      const otherAudio = audio.filter((c) => c !== audioDefault);
      if (otherVideo.length) {
        item('more-video', 'More video qualities');
        for (const c of otherVideo) child('more-video', `video:${c.key}`, t.video(c));
      }
      if (otherAudio.length) {
        item('more-audio', 'More audio formats');
        for (const c of otherAudio) child('more-audio', `audio:${c.key}`, t.audio(c));
      }
      if (subLangs.length > 1) {
        item('more-subs', 'Subtitles in one language');
        for (const lang of subLangs) child('more-subs', `subs:${lang}`, t.lang(lang));
      }
    } else if (menu.layout === 'flat') {
      const blocks = [];
      if (video.length) blocks.push(['VIDEO', video.map((c) => [`video:${c.key}`, t.video(c)])]);
      if (audio.length) blocks.push(['AUDIO', audio.map((c) => [`audio:${c.key}`, t.audio(c)])]);
      if (subLangs.length) {
        const rows = subLangs.map((lang) => [`subs:${lang}`, t.lang(lang)]);
        if (subLangs.length > 1) rows.push(['subs:*', `All: ${t.allLangs}`]);
        blocks.push(['SUBTITLES', rows]);
      }
      blocks.forEach(([header, rows], index) => {
        if (index) sep();
        item(`hdr-${header.toLowerCase()}`, header, { enabled: false });
        for (const [id, title] of rows) item(id, title);
      });
    } else {
      if (video.length) {
        item('grp-video', 'Video');
        for (const c of video) child('grp-video', `video:${c.key}`, t.video(c));
      }
      if (audio.length) {
        item('grp-audio', 'Audio');
        for (const c of audio) child('grp-audio', `audio:${c.key}`, t.audio(c));
      }
      if (subLangs.length) {
        item('grp-subs', 'Subtitles');
        for (const lang of subLangs) child('grp-subs', `subs:${lang}`, t.lang(lang));
        if (subLangs.length > 1) child('grp-subs', 'subs:*', `All: ${t.allLangs}`);
      }
    }

    // The player works on the current YouTube video page only.
    const playContexts = contexts.filter((key) => key === 'page' || key === 'video');
    if (menu.player && playContexts.length) {
      sep();
      item('play', playTitle, { contexts: playContexts, documentUrlPatterns: WATCH_PAGES });
    }
    if (!menu.settingsFirst) {
      sep();
      if (menu.openMetube) item('open', 'Open MeTube');
      item('settings', 'MeTube settings…');
    }

    items.push({ id: 'root', title: 'MeTube', contexts }, ...children);
  }

  if (menu.toolbar) {
    const toolbar = [['tb|play', `Play this video here${shortcut ? ` (${shortcut})` : ''}`]];
    if (videoDefault) toolbar.push([`tb|video:${videoDefault.key}`, `Download this page · ${t.video(videoDefault)}`]);
    if (audioDefault) toolbar.push([`tb|audio:${audioDefault.key}`, `Audio of this page · ${audioDefault.short}`]);
    if (subLangs.length) toolbar.push([`tb|${subsAll}`, `Subtitles of this page · ${t.allLangs}`]);
    toolbar.push(['tb|open', 'Open MeTube'], ['tb|settings', 'MeTube settings…']);
    for (const [id, title] of toolbar.slice(0, TOOLBAR_LIMIT)) items.push({ id, title, contexts: ['action'] });
  }
  return items;
}

/** "tb|video:1080" → {toolbar: true, action: "video", value: "1080"} */
export function parseMenuItemId(id) {
  let rest = String(id);
  const toolbar = rest.startsWith('tb|');
  if (toolbar) rest = rest.slice(3);
  const [action, value = null] = rest.split(':');
  return { toolbar, action, value };
}

/**
 * What a download entry sends: one set of /add options per request (one per
 * language for "every language"), and a label for the feedback.
 * @returns {{label: string, downloads: object[]}|null} null: not a download entry.
 */
export function menuDownloads({ action, value }, menu, langs) {
  if (action === 'video') {
    const choice = VIDEO_CHOICES.find((c) => c.key === value);
    if (!choice) return null;
    return {
      label: titles(menu, langs).video(choice),
      downloads: [{ downloadType: 'video', format: menu.video.format, quality: choice.key }],
    };
  }
  if (action === 'audio') {
    const choice = AUDIO_CHOICES.find((c) => c.key === value);
    if (!choice) return null;
    return {
      label: choice.label,
      downloads: [{ downloadType: 'audio', format: choice.format, quality: choice.quality }],
    };
  }
  if (action === 'subs') {
    const list = value === '*' ? langs : [value];
    if (!list.length) return null;
    return {
      label: `${list.map(languageName).join(' + ')} subtitles`,
      downloads: list.map((lang) => ({
        downloadType: 'captions',
        format: menu.subtitles.format,
        quality: 'best',
        subtitleLanguage: lang,
        // Hand-made subtitles when there are some, else YouTube's automatic ones.
        subtitleMode: 'prefer_manual',
      })),
    };
  }
  return null;
}
