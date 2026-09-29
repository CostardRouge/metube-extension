// Result feedback: toolbar badge, notification, and the last result the
// popup shows when it opens.

import { loadSettings } from '../lib/config.js';

const NOTIFICATION_ID = 'metube-result';
export const BADGE_COLORS = { busy: '#5b6170', ok: '#1f9d55', error: '#d93025', warn: '#c77700' };

let badgeTimer;

export function setBadge(text, color, clearAfterMs) {
  clearTimeout(badgeTimer);
  const ignore = () => {};
  chrome.action.setBadgeBackgroundColor({ color }).catch(ignore);
  chrome.action.setBadgeTextColor?.({ color: '#ffffff' })?.catch(ignore);
  chrome.action.setBadgeText({ text }).catch(ignore);
  if (clearAfterMs) {
    badgeTimer = setTimeout(() => chrome.action.setBadgeText({ text: '' }).catch(ignore), clearAfterMs);
  }
}

export function notify(title, message) {
  // Arc (and some OS setups) silently drop notifications: the badge and the
  // popup remain the primary feedback, so failures here are ignored.
  try {
    chrome.notifications?.create(
      NOTIFICATION_ID,
      { type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon-128.png'), title, message },
      () => void chrome.runtime.lastError,
    );
  } catch {
    // Notifications unavailable.
  }
}

/**
 * @param {{url: string, ok: boolean, error?: string}[]} results
 * @param {{label?: string}} options  What was sent, e.g. "audio" or "720p · MP4".
 */
export async function report(results, { label = '' } = {}) {
  const sent = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const suffix = label ? ` (${label})` : '';

  await chrome.storage.session.set({
    lastResult: {
      at: Date.now(),
      label,
      total: results.length,
      sent: sent.length,
      failed: failed.map(({ url, error }) => ({ url, error })),
    },
  });

  if (!failed.length) {
    setBadge(String(sent.length), BADGE_COLORS.ok, 8000);
    notify(`Sent to MeTube${suffix}`, sent.length === 1 ? sent[0].url : `${sent.length} downloads queued.`);
    return;
  }

  // The red "!" stays until the popup is opened (it shows the details).
  setBadge('!', BADGE_COLORS.error);
  notify(
    sent.length ? `MeTube: ${failed.length} of ${results.length} failed${suffix}` : `MeTube: not sent${suffix}`,
    failed[0].error,
  );
}

/** Nothing was sent, but the user should know why (amber "0"). */
export async function reportNothing(message) {
  await chrome.storage.session.set({ lastResult: { at: Date.now(), total: 0, sent: 0, failed: [], message } });
  setBadge('0', BADGE_COLORS.warn, 8000);
  notify('MeTube', message);
}

export async function onNotificationClicked(id) {
  if (id !== NOTIFICATION_ID) return;
  chrome.notifications.clear(id);
  const [{ lastResult }, settings] = await Promise.all([chrome.storage.session.get('lastResult'), loadSettings()]);
  if (lastResult?.failed?.length || !settings.baseUrl) chrome.runtime.openOptionsPage();
  else chrome.tabs.create({ url: `${settings.baseUrl}/` });
}
