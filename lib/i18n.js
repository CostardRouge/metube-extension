// Localized strings: chrome.i18n with _locales/<lang>/messages.json, so the
// extension follows the browser's language (English by default).
// Outside the extension (unit tests), messages can be provided directly.

let provided = null;

/** Tests: use these messages (a messages.json object) instead of chrome.i18n. */
export function useMessages(messages) {
  provided = { messages };
}

/**
 * The language of the messages in use, e.g. "fr": numbers and language names
 * are formatted in it, so a page never mixes two languages (a German browser
 * gets the English messages, and English formatting).
 */
export function uiLanguage() {
  return lookup('language', []) || 'en';
}

function lookup(key, substitutions) {
  if (provided) {
    const entry = provided.messages[key];
    if (!entry) return '';
    // Same rules as chrome.i18n.getMessage: $1…$9, and $$ for a literal $.
    return entry.message.replace(/\$(\$|\d)/g, (_, c) => (c === '$' ? '$' : (substitutions[Number(c) - 1] ?? '')));
  }
  return globalThis.chrome?.i18n?.getMessage?.(key, substitutions) ?? '';
}

/**
 * The message for `key`, with $1…$9 replaced by the substitutions.
 * A missing message shows its key, so it's easy to spot.
 */
export function t(key, ...substitutions) {
  return lookup(key, substitutions.map(String)) || key;
}

/**
 * Plural form: uses `${key}_one`, `${key}_other`… as the language's rules
 * pick (French: 0 and 1 are singular). $1 is the formatted count.
 */
export function tn(key, count, ...substitutions) {
  const category = new Intl.PluralRules(uiLanguage()).select(count);
  const args = [formatNumber(count), ...substitutions];
  return lookup(`${key}_${category}`, args.map(String)) || t(`${key}_other`, ...args);
}

/** 1.25 → "1.3" or "1,3" depending on the language. */
export function formatNumber(value, fractionDigits = 0) {
  return new Intl.NumberFormat(uiLanguage(), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** 42 → "42%" or "42 %" depending on the language. */
export function formatPercent(value) {
  return new Intl.NumberFormat(uiLanguage(), { style: 'percent', maximumFractionDigits: 0 }).format(value / 100);
}

/** "fr" → "French" (English UI) or "Français" (French UI). */
export function languageName(code) {
  try {
    const name = new Intl.DisplayNames([uiLanguage(), 'en'], { type: 'language' }).of(code) ?? code;
    return name.charAt(0).toLocaleUpperCase(uiLanguage()) + name.slice(1);
  } catch {
    return code;
  }
}

/**
 * Translate a page's static text: data-i18n (text), data-i18n-html (our own
 * messages with <code>/<b> markup), and data-i18n-title / -placeholder /
 * -aria-label attributes.
 */
export function localizePage(root = document) {
  if (root === document) document.documentElement.lang = uiLanguage();
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  // Trusted: the messages come from the extension's own _locales files.
  for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  for (const attr of ['title', 'placeholder', 'aria-label']) {
    for (const el of root.querySelectorAll(`[data-i18n-${attr}]`)) {
      el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`)));
    }
  }
}
