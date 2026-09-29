// Sending URLs to MeTube, with badge/notification feedback.

import { downloadOptions, parseBaseUrl } from '../lib/config.js';
import { MeTubeError, addDownload, getVersion } from '../lib/metube.js';
import { normalizeUrl } from '../lib/youtube.js';
import { BADGE_COLORS, report, reportNothing, setBadge } from './feedback.js';
import { requireSettings } from './settings.js';

const CONCURRENCY = 3;

function failure(url, err) {
  return { url, ok: false, error: err?.message ?? String(err), code: err?.code ?? 'unknown' };
}

/**
 * Send URLs to MeTube, then report through the badge and a notification.
 * @param {string[]} urls  Already normalized.
 * @returns {Promise<{url: string, ok: boolean, error?: string, code?: string}[]>}
 */
export async function sendUrls(urls, { audio = false } = {}) {
  setBadge('…', BADGE_COLORS.busy);

  let settings;
  try {
    settings = await requireSettings();
  } catch (err) {
    const results = urls.map((url) => failure(url, err));
    await report(results, { audio });
    return results;
  }

  const options = downloadOptions(settings, { audio });
  const results = new Array(urls.length);
  let fatal = null;
  let next = 0;

  // Small worker pool; once an error is known to affect every request
  // (bad credentials, host down…) the remaining URLs are not attempted.
  async function worker() {
    while (next < urls.length) {
      const index = next++;
      const url = urls[index];
      if (fatal) {
        results[index] = failure(url, fatal);
        continue;
      }
      try {
        await addDownload(settings, url, options);
        results[index] = { url, ok: true };
      } catch (err) {
        if (err instanceof MeTubeError && err.fatal) fatal = err;
        results[index] = failure(url, err);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));

  await report(results, { audio });
  return results;
}

// Message handlers for the popup and the options page.
export const SEND_HANDLERS = {
  async send({ urls, audio }) {
    const clean = [...new Set((Array.isArray(urls) ? urls : []).map(normalizeUrl).filter(Boolean))];
    if (!clean.length) {
      await reportNothing('Nothing to send.');
      return { results: [] };
    }
    return { results: await sendUrls(clean, { audio: Boolean(audio) }) };
  },

  // Uses the values currently in the options form, saved or not.
  async test({ settings }) {
    const { baseUrl, origin, originPattern } = parseBaseUrl(settings?.baseUrl);
    if (!(await chrome.permissions.contains({ origins: [originPattern] }))) {
      throw new MeTubeError('permission', `The extension is not allowed to access ${origin}.`);
    }
    const info = await getVersion({
      baseUrl,
      username: String(settings.username ?? ''),
      password: String(settings.password ?? ''),
    });
    return { ok: true, version: info?.version ?? null, ytdlp: info?.['yt-dlp'] ?? null };
  },
};
