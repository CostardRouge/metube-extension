// <video src> can't send an Authorization header, so a declarativeNetRequest
// rule adds it to the player's requests for MeTube files.
//
// The rule is deliberately narrow: GET requests for media, started by this
// extension's own pages, under the MeTube base URL. Requests from YouTube or
// any other site never get the credentials, so no page can use them to drive
// MeTube (add or delete downloads) behind your back.

import { loadSettings, parseBaseUrl } from '../lib/config.js';
import { basicAuth } from '../lib/metube.js';

const RULE_ID = 1;

export function buildAuthRule(settings, extensionId) {
  const auth = basicAuth(settings.username, settings.password);
  if (!settings.baseUrl || !auth) return null;
  let baseUrl;
  try {
    ({ baseUrl } = parseBaseUrl(settings.baseUrl));
  } catch {
    return null;
  }
  return {
    id: RULE_ID,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [{ header: 'Authorization', operation: 'set', value: auth }],
    },
    condition: {
      // "|" anchors the filter at the start of the URL.
      urlFilter: `|${baseUrl}/`,
      initiatorDomains: [extensionId],
      resourceTypes: ['media'],
      requestMethods: ['get'],
    },
  };
}

/** Rebuild the rule from the saved settings (or remove it). */
export async function syncAuthRule() {
  const rule = buildAuthRule(await loadSettings(), chrome.runtime.id);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RULE_ID],
    addRules: rule ? [rule] : [],
  });
}
