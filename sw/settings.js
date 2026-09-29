import { loadSettings, parseBaseUrl } from '../lib/config.js';
import { t } from '../lib/i18n.js';
import { MeTubeError } from '../lib/metube.js';

/**
 * Settings, checked to be usable: MeTube configured and its host granted.
 * @throws {MeTubeError} code "config" or "permission".
 */
export async function requireSettings() {
  const settings = await loadSettings();
  if (!settings.baseUrl) {
    throw new MeTubeError('config', t('errNotConfigured'));
  }
  const { origin, originPattern } = parseBaseUrl(settings.baseUrl);
  if (!(await chrome.permissions.contains({ origins: [originPattern] }))) {
    throw new MeTubeError('permission', t('errNoAccessSave', origin));
  }
  return settings;
}
