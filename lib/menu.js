// The right-click menus: their settings, and the chrome.contextMenus items
// built from them. Pure functions (no chrome.* calls), shared by the service
// worker, the options page preview and the tests.

import { languageName, t } from './i18n.js';

// Labels are getters: they are translated when read, not when this module loads.

const videoChoice = (key) => ({
  key,
  get label() {
    return key === 'best' ? t('qualityBestLong') : key === '2160' ? t('quality4k', key) : `${key}p`;
  },
  get short() {
    return key === 'best' ? t('qualityBest') : `${key}p`;
  },
});

export const VIDEO_CHOICES = ['best', '2160', '1440', '1080', '720', '480', '360'].map(videoChoice);

const FORMAT_NAMES = { m4a: 'M4A', mp3: 'MP3', opus: 'Opus', flac: 'FLAC', wav: 'WAV' };

const audioChoice = (key, format, quality, detailKey) => ({
  key,
  format,
  quality,
  get label() {
    const detail = detailKey ? t(detailKey) : quality === 'best' ? t('audioBest') : t('kbps', quality);
    return `${FORMAT_NAMES[format]} · ${detail}`;
  },
  get short() {
    return quality === 'best' ? FORMAT_NAMES[format] : `${FORMAT_NAMES[format]} ${quality}`;
  },
});

// Format/quality pairs MeTube's /add accepts for audio.
export const AUDIO_CHOICES = [
  audioChoice('m4a', 'm4a', 'best'),
  audioChoice('m4a-192', 'm4a', '192'),
  audioChoice('mp3-320', 'mp3', '320'),
  audioChoice('mp3-192', 'mp3', '192'),
  audioChoice('mp3-128', 'mp3', '128'),
  audioChoice('opus', 'opus', 'best'),
  audioChoice('flac', 'flac', 'best', 'audioLossless'),
  audioChoice('wav', 'wav', 'best', 'audioUncompressed'),
];

export const VIDEO_FORMATS = [
  { key: 'mp4', label: 'MP4' },
  {
    key: 'any',
    get label() {
      return t('formatAnyLong');
    },
  },
];

export const SUBTITLE_FORMATS = [
  { key: 'srt', label: 'SRT' },
  { key: 'vtt', label: 'VTT' },
  { key: 'txt', label: 'TXT' },
];

const labelled = (key, labelKey, helpKey) => ({
  key,
  get label() {
    return t(labelKey);
  },
  get help() {
    return helpKey ? t(helpKey) : '';
  },
});

export const LAYOUTS = [
  labelled('hybrid', 'layoutHybrid', 'layoutHybridHelp'),
  labelled('flat', 'layoutFlat', 'layoutFlatHelp'),
  labelled('submenus', 'layoutSubmenus', 'layoutSubmenusHelp'),
];

// chrome.contextMenus contexts where the MeTube menu can appear.
export const CONTEXTS = [
  labelled('page', 'contextPage'),
  labelled('link', 'contextLink'),
  labelled('selection', 'contextSelection'),
  labelled('video', 'contextVideo'),
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
  const label = titles(menu, langs);
  const video = menu.video.enabled ? VIDEO_CHOICES.filter((c) => menu.video.qualities.includes(c.key)) : [];
  const audio = menu.audio.enabled ? AUDIO_CHOICES.filter((c) => menu.audio.choices.includes(c.key)) : [];
  const subLangs = menu.subtitles.enabled ? langs : [];
  const videoDefault = video.find((c) => c.key === menu.video.oneClick) ?? video[0];
  const audioDefault = audio.find((c) => c.key === menu.audio.oneClick) ?? audio[0];
  const withShortcut = (title) => (shortcut ? `${title} (${shortcut})` : title);
  const playTitle = withShortcut(t('menuPlay'));
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
      item('hdr-selection', t('menuSelectionHeader'), { enabled: false, contexts: ['selection'] });
      sep('root', ['selection']);
    }
    if (menu.settingsFirst) {
      item('settings', t('menuSettings'));
      if (menu.openMetube) item('open', t('menuOpen'));
      sep();
    }

    if (menu.layout === 'hybrid') {
      if (videoDefault) item(`video:${videoDefault.key}`, t('menuVideoOneClick', label.video(videoDefault)));
      if (audioDefault) item(`audio:${audioDefault.key}`, t('menuAudioOneClick', audioDefault.short));
      if (subLangs.length) item(subsAll, t('menuSubtitlesOneClick', label.allLangs));
      sep();
      const otherVideo = video.filter((c) => c !== videoDefault);
      const otherAudio = audio.filter((c) => c !== audioDefault);
      if (otherVideo.length) {
        item('more-video', t('menuMoreVideo'));
        for (const c of otherVideo) child('more-video', `video:${c.key}`, label.video(c));
      }
      if (otherAudio.length) {
        item('more-audio', t('menuMoreAudio'));
        for (const c of otherAudio) child('more-audio', `audio:${c.key}`, label.audio(c));
      }
      if (subLangs.length > 1) {
        item('more-subs', t('menuOneLanguage'));
        for (const lang of subLangs) child('more-subs', `subs:${lang}`, label.lang(lang));
      }
    } else if (menu.layout === 'flat') {
      const blocks = [];
      if (video.length)
        blocks.push(['video', t('menuHeaderVideo'), video.map((c) => [`video:${c.key}`, label.video(c)])]);
      if (audio.length)
        blocks.push(['audio', t('menuHeaderAudio'), audio.map((c) => [`audio:${c.key}`, label.audio(c)])]);
      if (subLangs.length) {
        const rows = subLangs.map((lang) => [`subs:${lang}`, label.lang(lang)]);
        if (subLangs.length > 1) rows.push(['subs:*', t('menuAll', label.allLangs)]);
        blocks.push(['subtitles', t('menuHeaderSubtitles'), rows]);
      }
      blocks.forEach(([block, header, rows], index) => {
        if (index) sep();
        item(`hdr-${block}`, header, { enabled: false });
        for (const [id, title] of rows) item(id, title);
      });
    } else {
      if (video.length) {
        item('grp-video', t('video'));
        for (const c of video) child('grp-video', `video:${c.key}`, label.video(c));
      }
      if (audio.length) {
        item('grp-audio', t('audio'));
        for (const c of audio) child('grp-audio', `audio:${c.key}`, label.audio(c));
      }
      if (subLangs.length) {
        item('grp-subs', t('subtitles'));
        for (const lang of subLangs) child('grp-subs', `subs:${lang}`, label.lang(lang));
        if (subLangs.length > 1) child('grp-subs', 'subs:*', t('menuAll', label.allLangs));
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
      if (menu.openMetube) item('open', t('menuOpen'));
      item('settings', t('menuSettings'));
    }

    items.push({ id: 'root', title: t('menuRoot'), contexts }, ...children);
  }

  if (menu.toolbar) {
    const toolbar = [['tb|play', withShortcut(t('toolbarPlay'))]];
    if (videoDefault) toolbar.push([`tb|video:${videoDefault.key}`, t('toolbarVideo', label.video(videoDefault))]);
    if (audioDefault) toolbar.push([`tb|audio:${audioDefault.key}`, t('toolbarAudio', audioDefault.short)]);
    if (subLangs.length) toolbar.push([`tb|${subsAll}`, t('toolbarSubtitles', label.allLangs)]);
    toolbar.push(['tb|open', t('menuOpen')], ['tb|settings', t('menuSettings')]);
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
      label: t('subtitlesLabel', list.map(languageName).join(' + ')),
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
