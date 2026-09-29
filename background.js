// Service worker entry point: registers every listener at startup. The work
// lives in sw/: menus, sending, feedback, the overlay player and the auth
// rule for its media requests. All MeTube requests go through here.

import { syncAuthRule } from './sw/auth-rule.js';
import { onNotificationClicked } from './sw/feedback.js';
import { createMenus, onMenuClicked } from './sw/menus.js';
import { OVERLAY_HANDLERS, onCommand } from './sw/overlay.js';
import { SEND_HANDLERS } from './sw/send.js';

function logError(err) {
  console.error(err);
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  createMenus().catch(logError);
  syncAuthRule().catch(logError);
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) chrome.runtime.openOptionsPage();
});
chrome.runtime.onStartup.addListener(() => {
  createMenus().catch(logError);
  syncAuthRule().catch(logError);
});

// Settings saved: rebuild the menus (their entries come from the settings)
// and the player's auth rule (URL, credentials).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.settings) return;
  createMenus().catch(logError);
  syncAuthRule().catch(logError);
});

chrome.contextMenus.onClicked.addListener(onMenuClicked);
chrome.commands.onCommand.addListener(onCommand);
chrome.notifications?.onClicked?.addListener(onNotificationClicked);

const HANDLERS = { ...SEND_HANDLERS, ...OVERLAY_HANDLERS };

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only this extension's own pages may trigger requests.
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) return false;
  const handler = HANDLERS[message?.type];
  if (!handler) return false;
  handler(message, sender).then(sendResponse, (err) =>
    sendResponse({ ok: false, error: err?.message ?? String(err), code: err?.code }),
  );
  return true;
});
