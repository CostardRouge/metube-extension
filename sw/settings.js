import { loadSettings, parseBaseUrl } from '../lib/config.js';
import { MeTubeError } from '../lib/metube.js';

/**
 * Settings, checked to be usable: MeTube configured and its host granted.
 * @throws {MeTubeError} code "config" or "permission".
 */
export async function requireSettings() {
  const settings = await loadSettings();
  if (!settings.baseUrl) {
    throw new MeTubeError('config', 'MeTube is not configured yet: set its URL in the extension options.');
  }
  const { origin, originPattern } = parseBaseUrl(settings.baseUrl);
  if (!(await chrome.permissions.contains({ origins: [originPattern] }))) {
    throw new MeTubeError(
      'permission',
      `The extension is not allowed to access ${origin}. Open the options and click Save to grant it.`,
    );
  }
  return settings;
}
