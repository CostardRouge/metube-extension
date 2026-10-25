// Audience measurement for this website — never for the extension, which
// measures nothing. Loaded by index.html on its own, and imported by site.js
// for the switch in the legal notice; a module runs once either way.
//
// Umami, self-hosted by the publisher at insight.steevepommier.com, the same
// instance as his other sites: no cookie, no identifier across sites, no
// event sent by hand (every view is a full page load, so the tracker's own
// page view is all there is). The tracker is named /insight, not /script.js,
// which filter lists block.
//
// The tracker is not even requested when the visitor said no: Do Not Track,
// Global Privacy Control (which Umami ignores on its own), or Umami's own
// opt-out key `umami.disabled` in localStorage, which the legal notice's
// switch sets and clears. It only counts on the GitHub Pages host
// (data-domains): a local preview loads it and counts nothing.
//
// Nothing here is secret: the website id ends up in the page. This is its one
// home in the repository; an empty `websiteId` is the kill switch — no tag,
// no request. tests/audience.test.mjs holds the legal notice to this file.

export const AUDIENCE = Object.freeze({
  src: 'https://insight.steevepommier.com/insight',
  websiteId: '34e8b473-6182-4961-b76a-7c981a9a5a2f',
  domains: 'costardrouge.github.io',
});

/** Umami's own opt-out key: the tracker skips every send while it is set. */
export const OPT_OUT_KEY = 'umami.disabled';

/** localStorage, or null where the browser refuses it (private modes, blocked site data). */
export function siteStorage() {
  try {
    const storage = globalThis.localStorage;
    storage.getItem(OPT_OUT_KEY);
    return storage;
  } catch {
    return null;
  }
}

/** True when the browser asks not to be tracked: Do Not Track or Global Privacy Control. */
export function privacySignal(nav = globalThis.navigator, win = globalThis) {
  const dnt = nav?.doNotTrack ?? win?.doNotTrack ?? nav?.msDoNotTrack;
  return nav?.globalPrivacyControl === true || dnt === '1' || dnt === 'yes' || dnt === 1;
}

/** True when the visitor switched counting off in this browser. */
export function optedOut(storage = siteStorage()) {
  return Boolean(storage?.getItem(OPT_OUT_KEY));
}

/** Sets or clears the opt-out key; does nothing where storage is refused. */
export function setOptedOut(off, storage = siteStorage()) {
  if (!storage) return;
  if (off) storage.setItem(OPT_OUT_KEY, '1');
  else storage.removeItem(OPT_OUT_KEY);
}

/** The tracker tag's data attributes: the site, the hosts that count, and the address without query or fragment. */
export function trackerData(config = AUDIENCE) {
  return {
    websiteId: config.websiteId,
    domains: config.domains,
    doNotTrack: 'true',
    excludeSearch: 'true',
    excludeHash: 'true',
  };
}

/** True when this copy of the page can count at all: an id, and a host the tag lists. */
export function counting(config = AUDIENCE, host = globalThis.location?.hostname) {
  return Boolean(config.websiteId.trim()) && config.domains.split(',').includes(host);
}

/**
 * Adds the tracker to the page's head, unless the id is empty, the visitor
 * declined, or the tag is already there. Returns the tag, or null.
 */
export function startAudience({
  doc = globalThis.document,
  nav = globalThis.navigator,
  win = globalThis,
  storage = siteStorage(),
  config = AUDIENCE,
} = {}) {
  if (!doc || !config.websiteId.trim()) return null;
  if (privacySignal(nav, win) || optedOut(storage)) return null;
  if (doc.querySelector('script[data-umami="audience"]')) return null;
  const script = doc.createElement('script');
  script.defer = true;
  script.src = config.src;
  script.dataset.umami = 'audience';
  Object.assign(script.dataset, trackerData(config));
  doc.head.append(script);
  return script;
}

if (typeof document !== 'undefined') startAudience();
