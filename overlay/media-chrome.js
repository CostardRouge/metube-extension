// Media Chrome (vendored ES modules, see vendor/media-chrome/README.md), with
// its own labels (Play, Mute, Captions…) in the browser's language. The
// language is set before the elements are defined, so they render in it.

import { uiLanguage } from '../lib/i18n.js';
import { setLanguage } from '../vendor/media-chrome/utils/i18n.js';
import '../vendor/media-chrome/lang/fr.js';

setLanguage(uiLanguage());
await import('../vendor/media-chrome/index.js');
await import('../vendor/media-chrome/menu/index.js');
