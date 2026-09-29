// Service worker entry point: registers every listener at startup. The work
// lives in sw/: menus, sending, feedback. All MeTube requests go through here.

import { onNotificationClicked } from './sw/feedback.js';
import { createMenus, onMenuClicked } from './sw/menus.js';
import { SEND_HANDLERS } from './sw/send.js';

chrome.runtime.onInstalled.addListener(({ reason }) => {
  createMenus();
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) chrome.runtime.openOptionsPage();
});
chrome.runtime.onStartup.addListener(createMenus);

chrome.contextMenus.onClicked.addListener(onMenuClicked);
chrome.notifications?.onClicked?.addListener(onNotificationClicked);

const HANDLERS = { ...SEND_HANDLERS };

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
