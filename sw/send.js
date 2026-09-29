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
 * Queue downloads in MeTube, then report through the badge and a notification.
 * @param {string[]} urls  Already normalized.
 * @param {(settings: object) => object[]} optionsFor  The /add options for each
 *   URL: one request per entry (e.g. one per subtitle language). The default
 *   folder is added unless an entry sets its own.
 * @param {{label?: string}} [feedback]  What is sent, for the notification.
 * @returns {Promise<{url: string, ok: boolean, error?: string, code?: string}[]>}
 */
export async function sendDownloads(urls, optionsFor, { label = '' } = {}) {
  setBadge('…', BADGE_COLORS.busy);

  let settings;
  try {
    settings = await requireSettings();
  } catch (err) {
    const results = urls.map((url) => failure(url, err));
    await report(results, { label });
    return results;
  }

  const folder = String(settings.folder ?? '').trim();
  const perUrl = optionsFor(settings);
  const jobs = urls.flatMap((url) => perUrl.map((options) => ({ url, options: { folder, ...options } })));
  const results = new Array(jobs.length);
  let fatal = null;
  let next = 0;

  // Small worker pool; once an error is known to affect every request
  // (bad credentials, host down…) the remaining ones are not attempted.
  async function worker() {
    while (next < jobs.length) {
      const index = next++;
      const { url, options } = jobs[index];
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
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));

  await report(results, { label });
  return results;
}

/** Send with the default options (or the popup's "Audio only" preset). */
export function sendUrls(urls, { audio = false } = {}) {
  return sendDownloads(urls, (settings) => [downloadOptions(settings, { audio })], { label: audio ? 'audio' : '' });
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
