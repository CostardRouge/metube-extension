// The "Right-click menu" settings: controls, and a preview built with the
// same function the service worker uses to create the menus.

import {
  AUDIO_CHOICES,
  CONTEXTS,
  LAYOUTS,
  SUBTITLE_FORMATS,
  VIDEO_CHOICES,
  VIDEO_FORMATS,
  buildMenuItems,
  normalizeMenu,
} from '../lib/menu.js';
import { languageName, t } from '../lib/i18n.js';

// "Video player (2nd right-click on YouTube)" → "Video player"
const previewContexts = () => [
  ...CONTEXTS.map(({ key, label }) => ({ key, label: label.split(' (')[0] })),
  { key: 'action', label: t('previewContextAction') },
];

const EXTRAS = [
  ['settingsFirst', 'menuExtraSettingsFirst'],
  ['openMetube', 'menuExtraOpen'],
  ['player', 'menuExtraPlayer'],
  ['toolbar', 'menuExtraToolbar'],
];

const CAPTIONS = {
  link: 'previewCaptionLink',
  selection: 'previewCaptionSelection',
  page: 'previewCaptionPage',
  video: 'previewCaptionVideo',
};

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function segmented(name, options, value, onChange) {
  return options.map(({ key, label }) => {
    const input = el('input', { type: 'radio', name, value: key, checked: key === value });
    input.addEventListener('change', () => onChange(key));
    return el('label', {}, [input, el('span', { textContent: label })]);
  });
}

function checkbox(label, checked, onChange) {
  const input = el('input', { type: 'checkbox', checked });
  input.addEventListener('change', () => onChange(input.checked));
  return el('label', { className: 'check' }, [input, el('span', { textContent: label })]);
}

function chip(label, pressed, onToggle) {
  const button = el('button', { type: 'button', className: 'chip', textContent: label });
  button.setAttribute('aria-pressed', String(pressed));
  button.addEventListener('click', onToggle);
  return button;
}

function select(options, value, onChange) {
  const node = el(
    'select',
    {},
    options.map(({ key, label }) => new Option(label, key, false, key === value)),
  );
  node.disabled = !options.length;
  node.addEventListener('change', () => onChange(node.value));
  return node;
}

const toggleIn = (list, key) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

/**
 * @param {HTMLElement} root  The card holding the editor's placeholders.
 * @param {object} initial    Saved menu settings.
 * @param {{langs: () => string[], shortcut: () => string}} sources
 *   Values that live elsewhere on the page (subtitle languages, shortcut).
 */
export function createMenuEditor(root, initial, sources) {
  const $ = (id) => root.querySelector(`#${id}`);
  let menu = normalizeMenu(initial);
  let previewContext = 'page';

  function update(mutate) {
    const next = structuredClone(menu);
    mutate(next);
    menu = normalizeMenu(next);
    render();
  }

  function renderControls() {
    $('menu-layout').replaceChildren(
      ...segmented('menuLayout', LAYOUTS, menu.layout, (key) => update((m) => (m.layout = key))),
    );
    $('menu-layout-help').textContent = LAYOUTS.find((l) => l.key === menu.layout).help;

    $('menu-contexts').replaceChildren(
      ...CONTEXTS.map(({ key, label }) =>
        checkbox(label, menu.contexts[key], (on) => update((m) => (m.contexts[key] = on))),
      ),
    );

    // Video
    $('menu-video-head').replaceChildren(
      checkbox(t('video'), menu.video.enabled, (on) => update((m) => (m.video.enabled = on))),
      el(
        'div',
        { className: 'segmented small', role: 'radiogroup', ariaLabel: t('videoFormat') },
        segmented('menuVideoFormat', VIDEO_FORMATS, menu.video.format, (key) => update((m) => (m.video.format = key))),
      ),
    );
    $('menu-video-choices').replaceChildren(
      ...VIDEO_CHOICES.map((c) =>
        chip(c.short, menu.video.qualities.includes(c.key), () =>
          update((m) => (m.video.qualities = toggleIn(m.video.qualities, c.key))),
        ),
      ),
    );
    $('menu-video-oneclick').replaceChildren(
      select(
        VIDEO_CHOICES.filter((c) => menu.video.qualities.includes(c.key)).map((c) => ({ key: c.key, label: c.label })),
        menu.video.oneClick,
        (key) => update((m) => (m.video.oneClick = key)),
      ),
    );
    $('menu-video').classList.toggle('off', !menu.video.enabled);

    // Audio
    $('menu-audio-head').replaceChildren(
      checkbox(t('audio'), menu.audio.enabled, (on) => update((m) => (m.audio.enabled = on))),
    );
    $('menu-audio-choices').replaceChildren(
      ...AUDIO_CHOICES.map((c) =>
        chip(c.short, menu.audio.choices.includes(c.key), () =>
          update((m) => (m.audio.choices = toggleIn(m.audio.choices, c.key))),
        ),
      ),
    );
    $('menu-audio-oneclick').replaceChildren(
      select(
        AUDIO_CHOICES.filter((c) => menu.audio.choices.includes(c.key)).map((c) => ({ key: c.key, label: c.label })),
        menu.audio.oneClick,
        (key) => update((m) => (m.audio.oneClick = key)),
      ),
    );
    $('menu-audio').classList.toggle('off', !menu.audio.enabled);

    // Subtitles
    $('menu-subs-head').replaceChildren(
      checkbox(t('subtitles'), menu.subtitles.enabled, (on) => update((m) => (m.subtitles.enabled = on))),
      el(
        'div',
        { className: 'segmented small', role: 'radiogroup', ariaLabel: t('subtitleFormat') },
        segmented('menuSubsFormat', SUBTITLE_FORMATS, menu.subtitles.format, (key) =>
          update((m) => (m.subtitles.format = key)),
        ),
      ),
    );
    $('menu-subs').classList.toggle('off', !menu.subtitles.enabled);

    $('menu-extras').replaceChildren(
      ...EXTRAS.map(([key, labelKey]) => checkbox(t(labelKey), menu[key], (on) => update((m) => (m[key] = on)))),
    );
  }

  function renderLangs() {
    const langs = sources.langs();
    $('menu-subs-langs').textContent = langs.length
      ? langs.map((lang) => `${languageName(lang)} (${lang})`).join(', ')
      : t('menuLangsNone');
  }

  // A light, native-looking rendering; submenus are shown expanded, indented.
  function renderPreview() {
    const items = buildMenuItems(menu, { langs: sources.langs(), shortcut: sources.shortcut() });
    // The page is assumed to be a YouTube video page, so "Play here" shows.
    const visible = (item) => item.contexts.includes(previewContext);
    const box = el('div', { className: 'pm' });

    function rowsFor(parentId) {
      const rows = items.filter((item) => item.parentId === parentId && visible(item));
      // Chrome drops leading, trailing and repeated separators; so does the preview.
      const tidy = [];
      for (const row of rows) {
        const sep = row.type === 'separator';
        if (sep && (!tidy.length || tidy[tidy.length - 1].type === 'separator')) continue;
        tidy.push(row);
      }
      while (tidy.length && tidy[tidy.length - 1].type === 'separator') tidy.pop();
      return tidy;
    }

    function append(container, parentId) {
      for (const row of rowsFor(parentId)) {
        if (row.type === 'separator') {
          container.append(el('div', { className: 'pm-sep' }));
          continue;
        }
        const children = rowsFor(row.id);
        const node = el('div', { className: `pm-item${row.enabled === false ? ' disabled' : ''}` }, [
          el('span', { textContent: row.title }),
        ]);
        if (children.length) node.append(el('span', { className: 'pm-arrow', textContent: '›' }));
        container.append(node);
        if (children.length) {
          const sub = el('div', { className: 'pm-sub' });
          append(sub, row.id);
          container.append(sub);
        }
      }
    }

    let caption = '';
    if (previewContext === 'action') {
      const top = items.filter((item) => item.contexts.includes('action'));
      if (top.length) {
        for (const row of top)
          box.append(el('div', { className: 'pm-item' }, [el('span', { textContent: row.title })]));
        box.append(
          el('div', { className: 'pm-sep' }),
          el('div', { className: 'pm-item disabled' }, [el('span', { textContent: t('previewChromeEntries') })]),
        );
      } else {
        caption = t('previewNoToolbar');
      }
    } else {
      const rootItem = items.find((item) => item.id === 'root');
      if (rootItem?.contexts.includes(previewContext)) {
        const head = el('div', { className: 'pm-item pm-root' }, [
          el('img', { src: '../icons/icon-16.png', width: 14, height: 14, alt: '' }),
          el('span', { textContent: rootItem.title }),
          el('span', { className: 'pm-arrow', textContent: '›' }),
        ]);
        const sub = el('div', { className: 'pm-sub' });
        append(sub, 'root');
        box.append(head, sub);
        caption = t(CAPTIONS[previewContext]);
      } else {
        caption = t('previewHidden');
      }
    }

    $('menu-preview-context').replaceChildren(
      ...segmented('menuPreview', previewContexts(), previewContext, (key) => {
        previewContext = key;
        renderPreview();
      }),
    );
    $('menu-preview').replaceChildren(...(box.childElementCount ? [box] : []));
    $('menu-preview-caption').textContent = caption;
  }

  function render() {
    renderControls();
    renderLangs();
    renderPreview();
  }

  render();
  return {
    /** The settings as currently edited. */
    value: () => menu,
    /** Re-render what depends on other fields (languages, shortcut). */
    refresh: () => {
      renderLangs();
      renderPreview();
    },
  };
}
