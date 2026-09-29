import { CATALOG, coerceOptions, loadSettings, parseBaseUrl, parseSubtitleLangs, saveSettings } from '../lib/config.js';

const $ = (id) => document.getElementById(id);
const els = {
  form: $('form'),
  baseUrl: $('baseUrl'),
  username: $('username'),
  password: $('password'),
  togglePassword: $('toggle-password'),
  format: $('format'),
  quality: $('quality'),
  folder: $('folder'),
  subtitleLangs: $('subtitleLangs'),
  shortcut: $('shortcut'),
  changeShortcut: $('change-shortcut'),
  status: $('status'),
  test: $('test'),
  save: $('save'),
};

// Last format/quality picked for each type, so flipping Video ⇄ Audio
// doesn't lose the other side's choice.
const lastChoice = {};

function currentType() {
  return els.form.elements.downloadType.value || 'video';
}

function fillSelect(select, entries, value) {
  select.replaceChildren(
    ...entries.map(([optionValue, label]) => new Option(label, optionValue, false, optionValue === value)),
  );
}

function renderChoices(format, quality) {
  const type = currentType();
  const coerced = coerceOptions({ downloadType: type, format, quality });
  const formats = CATALOG[type].formats;
  fillSelect(
    els.format,
    Object.entries(formats).map(([value, def]) => [value, def.label]),
    coerced.format,
  );
  fillSelect(els.quality, formats[coerced.format].qualities, coerced.quality);
  lastChoice[type] = { format: coerced.format, quality: coerced.quality };
}

function readForm(baseUrl) {
  return {
    baseUrl,
    username: els.username.value.trim(),
    password: els.password.value,
    ...coerceOptions({ downloadType: currentType(), format: els.format.value, quality: els.quality.value }),
    folder: els.folder.value.trim(),
    subtitleLangs: parseSubtitleLangs(els.subtitleLangs.value).langs.join(','),
  };
}

// Validated before the permission request, which must stay synchronous.
function checkSubtitleLangs() {
  const { invalid } = parseSubtitleLangs(els.subtitleLangs.value);
  if (!invalid.length) return true;
  showStatus(`Not a language code: ${invalid.join(', ')}. Use codes like fr, en or pt-BR.`, 'error');
  els.subtitleLangs.focus();
  return false;
}

async function renderShortcut() {
  const commands = (await chrome.commands?.getAll()) ?? [];
  const shortcut = commands.find((c) => c.name === 'toggle-overlay')?.shortcut;
  els.shortcut.textContent = shortcut || 'Not set';
  els.shortcut.classList.toggle('muted', !shortcut);
}

function showStatus(message, kind) {
  els.status.className = `notice ${kind === 'busy' ? '' : kind}`.trim();
  const children = [document.createTextNode(message)];
  if (kind === 'busy') {
    const spinner = document.createElement('span');
    spinner.className = 'spinner muted';
    children.unshift(spinner);
  }
  els.status.replaceChildren(...children);
  els.status.hidden = false;
}

function setBusy(busy) {
  els.test.disabled = busy;
  els.save.disabled = busy;
}

function parseUrlField() {
  try {
    return parseBaseUrl(els.baseUrl.value);
  } catch (err) {
    showStatus(err.message, 'error');
    els.baseUrl.focus();
    return null;
  }
}

function deniedMessage(origin) {
  return `Access to ${origin} was not granted, so the extension can't reach MeTube. Click Save or Test again and allow it.`;
}

async function runTest(permission, parsed) {
  setBusy(true);
  showStatus(`Connecting to ${parsed.origin}…`, 'busy');
  try {
    if (!(await permission)) {
      showStatus(deniedMessage(parsed.origin), 'error');
      return;
    }
    const res = await chrome.runtime.sendMessage({ type: 'test', settings: readForm(parsed.baseUrl) });
    if (!res?.ok) {
      showStatus(res?.error ?? 'The extension background did not answer.', 'error');
      return;
    }
    const version = res.version ? ` to MeTube ${res.version}` : '';
    const ytdlp = res.ytdlp ? ` (yt-dlp ${res.ytdlp})` : '';
    showStatus(`Connected${version}${ytdlp}.`, 'ok');
  } catch (err) {
    showStatus(err.message, 'error');
  } finally {
    setBusy(false);
  }
}

// When the host changes, give back access to the previous one.
async function dropPreviousPermission(previousBaseUrl, newPattern) {
  if (!previousBaseUrl) return;
  try {
    const { originPattern } = parseBaseUrl(previousBaseUrl);
    if (originPattern !== newPattern) await chrome.permissions.remove({ origins: [originPattern] });
  } catch {
    // Already removed, or not removable.
  }
}

async function save(permission, parsed) {
  setBusy(true);
  try {
    let granted = false;
    try {
      granted = await permission;
    } catch (err) {
      console.warn('Permission request failed:', err);
    }
    const previous = await loadSettings();
    const next = readForm(parsed.baseUrl);
    await saveSettings(next);
    els.baseUrl.value = next.baseUrl;
    if (granted) await dropPreviousPermission(previous.baseUrl, parsed.originPattern);

    if (!granted) {
      showStatus(`Saved, but: ${deniedMessage(parsed.origin)}`, 'warn');
    } else if (parsed.origin.startsWith('http:') && (next.username || next.password)) {
      showStatus('Saved. Note: over http:// the credentials travel unencrypted.', 'warn');
    } else {
      showStatus('Saved.', 'ok');
    }
  } catch (err) {
    showStatus(`Could not save: ${err.message}`, 'error');
  } finally {
    setBusy(false);
  }
}

function wireEvents() {
  for (const radio of els.form.elements.downloadType) {
    radio.addEventListener('change', () => {
      const remembered = lastChoice[currentType()] ?? {};
      renderChoices(remembered.format, remembered.quality ?? els.quality.value);
    });
  }
  els.format.addEventListener('change', () => renderChoices(els.format.value, els.quality.value));
  els.quality.addEventListener('change', () => renderChoices(els.format.value, els.quality.value));

  els.togglePassword.addEventListener('click', () => {
    const show = els.password.type === 'password';
    els.password.type = show ? 'text' : 'password';
    els.togglePassword.setAttribute('aria-pressed', String(show));
    els.togglePassword.title = show ? 'Hide password' : 'Show password';
  });

  // chrome.permissions.request() needs the user gesture: it is called
  // synchronously in the handlers, before anything is awaited.
  els.test.addEventListener('click', () => {
    const parsed = parseUrlField();
    if (!parsed) return;
    runTest(chrome.permissions.request({ origins: [parsed.originPattern] }), parsed);
  });

  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const parsed = parseUrlField();
    if (!parsed || !checkSubtitleLangs()) return;
    save(chrome.permissions.request({ origins: [parsed.originPattern] }), parsed);
  });

  // Arc redirects chrome://extensions/shortcuts to its own page.
  els.changeShortcut.addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));
  // Pick up a shortcut changed in the other tab.
  window.addEventListener('focus', renderShortcut);
}

async function init() {
  const settings = await loadSettings();
  els.baseUrl.value = settings.baseUrl;
  els.username.value = settings.username;
  els.password.value = settings.password;
  els.folder.value = settings.folder;
  els.subtitleLangs.value = settings.subtitleLangs.split(',').join(', ');
  const { downloadType } = coerceOptions(settings);
  els.form.elements.downloadType.value = downloadType;
  renderChoices(settings.format, settings.quality);
  wireEvents();
  renderShortcut();

  if (!settings.baseUrl) {
    els.baseUrl.focus();
    return;
  }
  try {
    const { origin, originPattern } = parseBaseUrl(settings.baseUrl);
    if (!(await chrome.permissions.contains({ origins: [originPattern] }))) {
      showStatus(`The extension can't access ${origin} yet: click Save to grant it.`, 'warn');
    }
  } catch {
    // Stored URL invalid: the user will fix it on save.
  }
}

init();
