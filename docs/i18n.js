// Site texts. English lives in index.html (site.js captures it from the
// data-i18n elements); `en` below only holds the strings that JavaScript
// builds itself. `fr` holds every key. tests/site.test.mjs checks that the
// two sets match.

export const en = {
  heroDownloadVersion: 'Download v$1 (zip)',
  heroNoteVersion: 'Free and open source. Latest release published on $1, with its SHA-256 checksum.',
  layoutHybridHelp: 'Your defaults in one click; the other choices under “More…”.',
  layoutFlatHelp: 'Everything in one submenu, under section titles: one hover, one click.',
  layoutSubmenusHelp: 'One submenu per block: a short menu, every choice one level down.',
  menuHeaderVideo: 'VIDEO',
  menuHeaderAudio: 'AUDIO',
  menuHeaderSubtitles: 'SUBTITLES',
  menuPlay: 'Play here with MeTube',
  subtitles: 'Subtitles',
  mBest: 'Best quality · MP4',
  m1080: '1080p · MP4',
  m720: '720p · MP4',
  m480: '480p · MP4',
  mM4a: 'M4A · best quality',
  mMp3: 'MP3 · 320 kbps',
  mOpus: 'Opus · best quality',
  mSubsBoth: 'French + English (SRT)',
  mSubsFr: 'French · SRT',
  mSubsEn: 'English · SRT',
  optConnecting: 'Connecting to $1…',
  optConnectedDemo: 'Connected to MeTube 2025.x (yt-dlp 2025.x).',
  overlayDownloading: 'MeTube is downloading this video…',
  overlayProgress: '$1 % · $2',
  popupSelected4: '4 YouTube links · 4 selected',
  popupSend4: 'Send 4 selected',
  toastSent1: 'Sent to MeTube · Video · 1080p · MP4',
  toastDeleted: 'Deleted from MeTube. The file is gone from the server.',
};

export const fr = {
  // Meta, header
  metaTitle: 'MeTube Sender – YouTube vers votre MeTube, en un clic droit',
  metaDescription:
    'Une extension Chrome et Arc qui envoie les vidéos, shorts et playlists YouTube vers votre MeTube auto-hébergé, et lit ses téléchargements dans un lecteur superposé sur YouTube.',
  skip: 'Aller au contenu',
  langSwitch: 'Changer de langue',
  navFeatures: 'Fonctions',
  navInstall: 'Installation',
  navConfigure: 'Réglages',
  navMenu: 'Menu',
  navPlayer: 'Lecteur',
  navServer: 'Serveur',
  navTroubleshooting: 'Aide',

  // Hero
  heroNoBuild: 'Sans build',
  heroTitle: 'YouTube → votre MeTube,<br />en un clic droit.',
  heroLead:
    'MeTube Sender envoie vidéos, shorts et playlists vers votre <a href="https://github.com/alexta69/metube">MeTube</a> auto-hébergé depuis n’importe quelle page, puis lit ce que MeTube a téléchargé dans un lecteur superposé, directement sur YouTube.',
  heroDownload: 'Télécharger la dernière version',
  heroDownloadVersion: 'Télécharger la v$1 (zip)',
  heroInstall: 'Guide d’installation',
  heroNote: 'Libre et open source. Un zip avec sa somme SHA-256 à chaque version.',
  heroNoteVersion: 'Libre et open source. Dernière version publiée le $1, avec sa somme SHA-256.',

  // Teaser
  teaserLabel: 'Démonstration animée de l’extension',
  teaserReplay: 'Rejouer',
  teaser0: 'N’importe quelle page, n’importe quel lien YouTube.',
  teaser1: 'Un clic droit, et c’est parti vers MeTube, dans la qualité que vous avez choisie.',
  teaser2: 'Ou ouvrez la fenêtre : elle liste toutes les vidéos de la page. Cochez, envoyez.',
  teaser3: 'Puis Alt+Maj+M : regardez-la depuis MeTube, directement sur YouTube.',
  teaser4: 'Vue une fois ? Supprimez-la de MeTube. Terminé.',
  teaserSubtitle: '— Des sous-titres, là où vous avez quitté YouTube.',
  ctxOpenTab: 'Ouvrir le lien dans un nouvel onglet',
  ctxOpenWindow: 'Ouvrir le lien dans une nouvelle fenêtre',
  ctxCopy: 'Copier l’adresse du lien',
  ctxInspect: 'Inspecter',
  menuSettings: 'Réglages MeTube…',
  menuOpen: 'Ouvrir MeTube',
  menuPlay: 'Lire ici avec MeTube',
  menuVideo1080: 'Vidéo · 1080p · MP4',
  menuAudioM4a: 'Audio · M4A',
  menuSubsFrEn: 'Sous-titres · Français + Anglais (SRT)',
  menuMoreVideo: 'Autres qualités vidéo',
  menuMoreAudio: 'Autres formats audio',
  menuOneLanguage: 'Sous-titres dans une langue',
  menuHeaderVideo: 'VIDÉO',
  menuHeaderAudio: 'AUDIO',
  menuHeaderSubtitles: 'SOUS-TITRES',
  popupCurrentPage: 'Page actuelle',
  popupPlay: 'Lire',
  popupLinks: '4 liens YouTube',
  popupSelected4: '4 liens YouTube · 4 sélectionnés',
  popupSend4: 'Envoyer 4 liens',
  popupAll: 'Tout',
  popupNone: 'Aucun',
  popupAudioOnly: 'Audio seul (m4a)',
  popupSendSelected: 'Envoyer la sélection',
  overlayLookingUp: 'Recherche de cette vidéo dans MeTube…',
  overlayDownloading: 'MeTube télécharge cette vidéo…',
  overlayProgress: '$1 % · $2',
  overlayEndTitle: 'Vidéo terminée',
  deleteFromMeTube: 'Supprimer de MeTube',
  overlayWatchAgain: 'Revoir',
  overlayKeep: 'Garder et fermer',
  overlayKeys: 'Espace lecture/pause · ←/→ 5 s · F plein écran · C sous-titres · M muet · Suppr supprimer · Échap fermer',
  toastSent1: 'Envoyé vers MeTube · Vidéo · 1080p · MP4',
  toastDeleted: 'Supprimé de MeTube. Le fichier a bien disparu du serveur.',

  // Features
  featKicker: 'Ce qu’elle fait',
  featTitle: 'Toutes les façons d’envoyer une vidéo, et une façon de la regarder.',
  featMenuTitle: 'Menu du clic droit',
  featMenuText:
    'Une entrée <b>MeTube</b> sur les liens, les pages, le texte sélectionné et le lecteur YouTube. Trois blocs (vidéo, audio, sous-titres), avec les entrées, les choix en un clic et la disposition que vous décidez.',
  featPopupTitle: 'Une fenêtre qui analyse la page',
  featPopupText:
    'Le bouton de la barre d’outils liste les vidéos, shorts et playlists liés depuis la page courante, lecteurs intégrés compris, avec leurs titres. Cochez-en quelques-uns ou tous, puis envoyez. <b>Audio seul</b> est à un clic.',
  featPlayerTitle: 'Lecteur sur YouTube',
  featPlayerText:
    'Sur une page de vidéo, <kbd>Alt</kbd>+<kbd>Maj</kbd>+<kbd>M</kbd> ouvre la vidéo depuis MeTube dans un lecteur superposé : il reprend là où vous étiez, affiche la progression du téléchargement s’il est encore en cours, et lit vos sous-titres.',
  featCleanTitle: 'URL propres',
  featCleanText:
    'Les liens YouTube sont réduits à <code>v</code>, <code>list</code> et <code>t</code> : plus de <code>si</code>, <code>pp</code>, <code>feature</code> ni <code>index</code>. Les liens courts, mobiles, live et embed deviennent l’URL watch standard. Les autres sites passent tels quels, puisque MeTube accepte tout ce que yt-dlp sait faire.',
  featFeedbackTitle: 'Un retour visible',
  featFeedbackText:
    'Le badge compte ce qui a été envoyé. Un <b>!</b> rouge signale un échec : ouvrez la fenêtre pour en lire la raison. Quand le navigateur affiche les notifications, vous en recevez une aussi.',
  featLangTitle: 'Anglais et français',
  featLangText:
    'Menus, fenêtre, réglages, lecteur, notifications et erreurs suivent la langue du navigateur, nombres et tailles compris (<code>1.2 GB</code>, <code>1,2 Go</code>). Ajouter une langue, c’est un fichier JSON.',

  // Install
  installKicker: 'Installation',
  installTitle: 'Trois clics dans votre navigateur. Sans boutique.',
  installLead:
    'Téléchargez le dernier <code>metube-sender-&lt;version&gt;.zip</code> et décompressez-le dans un dossier que vous garderez. Pour utiliser le code non publié, clonez plutôt le dépôt.',
  installStep1: 'Ouvrez <code class="browser-url">chrome://extensions</code>.',
  installStep2: 'Activez le <b>Mode développeur</b> (interrupteur en haut à droite).',
  installStep3: 'Cliquez sur <b>Charger l’extension non empaquetée</b> et choisissez le dossier qui contient <code>manifest.json</code>.',
  installStep4: 'La page des réglages s’ouvre. Saisissez l’URL de votre MeTube, <b>Enregistrer</b>, <b>Autoriser</b>, <b>Tester la connexion</b>.',
  installStep5Chrome: 'Facultatif : cliquez sur l’icône puzzle et épinglez <b>MeTube Sender</b>, pour que son badge reste visible.',
  installStep5Arc:
    'Épinglez l’extension (menu des extensions dans la barre latérale / barre d’adresse) pour atteindre la fenêtre et voir le badge. Arc affiche rarement les notifications des extensions : le badge et la fenêtre montrent chaque résultat quand même.',
  devMode: 'Mode développeur',
  loadUnpacked: 'Charger l’extension non empaquetée',
  packExt: 'Empaqueter l’extension',
  updateExt: 'Mettre à jour',
  extDescription:
    'Envoyez des vidéos YouTube vers votre MeTube auto-hébergé, et regardez ses téléchargements dans un lecteur superposé sur YouTube.',
  extDetails: 'Détails',
  extRemove: 'Supprimer',
  extErrors: 'Erreurs',
  shortcutTitle: 'Raccourci clavier',
  shortcutText:
    'Le raccourci du lecteur est <kbd>Alt</kbd>+<kbd>Maj</kbd>+<kbd>M</kbd> (<kbd>Option</kbd>+<kbd>Maj</kbd>+<kbd>M</kbd> sur Mac). Pour le changer, ou si une autre extension l’utilise déjà, ouvrez <code class="browser-url">chrome://extensions</code><code>/shortcuts</code> et modifiez <b>Lire la vidéo YouTube en cours depuis MeTube</b>. La page des réglages affiche le raccourci actuel et a un bouton <b>Modifier le raccourci</b>.',
  updateTitle: 'Mise à jour',
  updateText:
    'Décompressez la nouvelle version dans le <b>même</b> dossier, en remplaçant ses fichiers (ou tirez le nouveau code), puis cliquez sur l’icône de rechargement sur la carte de l’extension. La charger depuis un autre dossier installe une seconde extension, sans vos réglages.',

  // Configure
  confKicker: 'Réglages',
  confTitle: 'Une URL, et vous êtes connecté.',
  confLead:
    'Quand vous cliquez sur <b>Enregistrer</b>, le navigateur demande l’autorisation d’accéder à l’hôte de votre MeTube : cliquez sur <b>Autoriser</b>. Puis <b>Tester la connexion</b> appelle <code>/version</code> et affiche les versions de MeTube et de yt-dlp qu’il trouve.',
  optSettingsTitle: 'Réglages',
  optBaseUrl: 'URL de MeTube',
  optUsername: 'Nom d’utilisateur',
  optPassword: 'Mot de passe',
  optDownloadType: 'Type de téléchargement',
  video: 'Vidéo',
  audio: 'Audio',
  subtitles: 'Sous-titres',
  optFormat: 'Format',
  optQuality: 'Qualité',
  optTest: 'Tester la connexion',
  optSave: 'Enregistrer',
  optConnecting: 'Connexion à $1…',
  optConnectedDemo: 'Connecté à MeTube 2025.x (yt-dlp 2025.x).',
  setUrl:
    'p. ex. <code>https://metube.example.com</code>. Si MeTube tourne sous un préfixe de chemin (<code>URL_PREFIX</code>), incluez-le : <code>https://example.com/metube</code>.',
  setAuthName: 'Nom d’utilisateur / Mot de passe',
  setAuth:
    'Envoyés en <code>Authorization: Basic …</code> avec chaque requête, p. ex. pour le <code>basicAuth</code> de Traefik. Laissez les deux vides si MeTube n’est pas derrière une authentification.',
  setDefaultsName: 'Type de téléchargement / Format / Qualité',
  setDefaults:
    'Valeurs par défaut de chaque envoi. Vidéo : format Tous ou MP4, qualité Meilleure, 2160p … 240p ou Minimale. Audio : M4A, MP3 ou Opus, avec les qualités que MeTube accepte pour chaque format.',
  setFolderName: 'Dossier',
  setFolder:
    'Sous-dossier facultatif du répertoire de téléchargement de MeTube. MeTube doit tourner avec <code>CUSTOM_DIRS=true</code>, plus <code>CREATE_CUSTOM_DIRS=true</code> si le dossier n’existe pas encore.',
  optMenu: 'Menu du clic droit',
  setMenu: 'Disposition, où il apparaît, et les entrées de chaque bloc. Voir <a href="#menu">Menu du clic droit</a>.',
  optSubtitleLangs: 'Langues des sous-titres',
  setLangs:
    'Langues que le lecteur cherche, séparées par des virgules (par défaut <code>fr, en</code>). Elles doivent correspondre aux <code>subtitleslangs</code> que MeTube télécharge. Le bloc sous-titres du menu utilise la même liste.',
  setEndName: 'À la fin d’une vidéo, proposer de la supprimer',
  setEnd: 'Activé par défaut. Voir <a href="#deleting">Supprimer une vidéo</a>.',
  confPrivacy:
    'Tous les réglages, mot de passe compris, sont conservés dans le stockage de l’extension de ce navigateur (<code>chrome.storage.local</code>). Ils ne sont envoyés nulle part ailleurs que vers votre hôte MeTube.',

  // Menu
  menuKicker: 'Menu du clic droit',
  menuTitle: 'Votre menu, votre disposition.',
  menuLead:
    'Faites un clic droit sur un lien, une page, du texte sélectionné ou une vidéo YouTube (second clic droit sur le lecteur : le premier ouvre le menu de YouTube, que les extensions ne peuvent pas modifier). Choisissez une disposition ci-dessous pour voir ce que propose l’entrée <b>MeTube</b>.',
  layoutHybrid: 'Hybride',
  layoutFlat: 'À plat',
  layoutSubmenus: 'Sous-menus',
  layoutHybridHelp: 'Vos choix par défaut en un clic ; les autres sous « Autres… ».',
  layoutFlatHelp: 'Tout dans un seul sous-menu, sous des titres de section : un survol, un clic.',
  layoutSubmenusHelp: 'Un sous-menu par bloc : un menu court, chaque choix un niveau plus bas.',
  mBest: 'Meilleure qualité · MP4',
  m1080: '1080p · MP4',
  m720: '720p · MP4',
  m480: '480p · MP4',
  mM4a: 'M4A · meilleure qualité',
  mMp3: 'MP3 · 320 kbit/s',
  mOpus: 'Opus · meilleure qualité',
  mSubsBoth: 'Français + Anglais (SRT)',
  mSubsFr: 'Français · SRT',
  mSubsEn: 'Anglais · SRT',
  menuNoteBlocks:
    '<b>Blocs</b> : vidéo (MP4 ou tous formats, qualités de Meilleure à 360p), audio (M4A, MP3 320/192/128, Opus, FLAC, WAV), sous-titres (SRT, VTT ou TXT, un téléchargement par langue). Chaque bloc peut être désactivé et a son choix en un clic.',
  menuNoteContexts:
    '<b>Afficher MeTube sur</b> : pages, liens, texte sélectionné, lecteur vidéo. Une sélection de texte envoie chaque lien YouTube qu’elle contient, liens <code>&lt;a&gt;</code> comme URL écrites en clair, sans doublon.',
  menuNoteExtras:
    '<b>Autres entrées</b> : réglages en haut ou en bas, <b>Ouvrir MeTube</b>, <b>Lire ici</b>, et le menu propre à l’icône de l’extension (lire, télécharger vidéo/audio/sous-titres, ouvrir MeTube pour l’onglet courant).',
  menuNoteSubs:
    '<b>Fichiers de sous-titres</b> : le bloc sous-titres demande à MeTube le fichier de sous-titres seul. Les sous-titres faits main quand la vidéo en a, ceux automatiques de YouTube sinon.',
  menuNotePlace:
    'C’est Chrome qui place l’entrée MeTube, près d’<b>Inspecter</b> : aucune extension ne peut la mettre tout en haut. Le menu de l’icône de l’extension est le seul endroit où ses entrées viennent en premier.',

  // Player
  playerKicker: 'Lecteur sur YouTube',
  playerTitle: 'Regardez-la depuis MeTube, sans quitter YouTube.',
  playerLead:
    'Sur une page <code>youtube.com/watch?v=…</code>, appuyez sur le raccourci ou cliquez sur <b>Lire</b> dans la fenêtre. Le lecteur superposé met le lecteur YouTube en pause, note où vous en étiez, et cherche la vidéo dans l’historique de MeTube par identifiant. Ensuite :',
  stateDoneTitle: 'Déjà téléchargée',
  stateDoneText: 'Lit le fichier. Si vous aviez regardé plus de 5 secondes sur YouTube, il reprend là.',
  stateQueuedTitle: 'En file ou en cours',
  stateQueuedText: 'Affiche la progression, rafraîchie toutes les 2 secondes, et lance la lecture à la fin du téléchargement.',
  stateNewTitle: 'Absente de MeTube',
  stateNewText: 'L’ajoute avec vos options par défaut, puis affiche la progression.',
  stateFailedTitle: 'En échec dans MeTube',
  stateFailedText: 'Affiche l’erreur de MeTube (privée, limite d’âge, supprimée…), avec <b>Réessayer</b>.',
  keysTitle: 'Clavier',
  keyPlay: 'lecture / pause',
  keySeek: 'avancer / reculer de 5 secondes',
  keyFull: 'plein écran (ou double-clic sur l’image)',
  keySubs: 'sous-titres activés / désactivés',
  keyMute: 'muet',
  keyDelete: 'supprimer de MeTube',
  keyClose: 'fermer (YouTube reste en pause)',
  keysNote:
    'Lecture/pause, navigation, volume, vitesse (0,5× à 2× dans le menu <b>⋯</b>), sous-titres, image dans l’image et plein écran sont dans la barre de contrôle. Le lecteur se ferme aussi quand vous passez à une autre vidéo.',
  deleteTitle: 'Supprimer une vidéo',
  deleteText1:
    'Le lecteur sert à regarder une vidéo une fois, quand le streaming YouTube est hors de portée. Une fois vue, le fichier peut partir :',
  deleteTrash:
    '<b>Bouton corbeille</b> ou <kbd>Suppr</kbd> : une confirmation affiche le titre, la qualité, la taille et les sous-titres. <b>Annuler</b> est présélectionné, donc Entrée ne supprime jamais par accident.',
  deleteEnd:
    '<b>À la fin de la vidéo</b> (sauf si désactivé dans les réglages) : <b>Supprimer de MeTube</b>, <b>Revoir</b>, ou <b>Garder et fermer</b>. Rien n’est supprimé sans un clic.',
  deleteNote:
    'Après la suppression, l’extension vérifie si le fichier a vraiment disparu du serveur et le dit. MeTube n’efface les fichiers que s’il est configuré pour : voir <a href="#server">Réglage du serveur</a>.',
  authHowTitle: 'Comment la vidéo passe l’authentification basique',
  authHowText:
    'Un élément <code>&lt;video&gt;</code> ne peut pas envoyer d’en-tête <code>Authorization</code>. L’extension en ajoute un avec une règle <code>declarativeNetRequest</code>, reconstruite à chaque enregistrement des réglages. La règle ne s’applique qu’aux requêtes <b>GET</b> de média, lancées par le lecteur de l’extension, vers l’URL de votre MeTube. Les requêtes de YouTube ou de tout autre site ne reçoivent jamais vos identifiants : une page web ne peut donc pas s’en servir pour ajouter ou supprimer des téléchargements. Toute autre requête (<code>/history</code>, <code>/add</code>, fichiers de sous-titres) est envoyée par le service worker.',

  // Server
  serverKicker: 'Réglage du serveur MeTube',
  serverTitle: 'Trois lignes côté serveur, pour l’expérience complète.',
  serverLead:
    'L’envoi marche avec n’importe quel MeTube. Le lecteur en demande un peu plus : des sous-titres écrits à côté des vidéos, du HTTPS, et la permission d’effacer les fichiers.',
  srvSubsTitle: 'Sous-titres',
  srvSubsText:
    'MeTube n’écrit des fichiers de sous-titres que si on le demande à yt-dlp. Ajoutez ceci à l’environnement de MeTube, avec les mêmes langues que dans les réglages de l’extension. yt-dlp enregistre alors <code>&lt;vidéo&gt;.&lt;langue&gt;.vtt</code> à côté de chaque vidéo, et le lecteur charge chacun qu’il trouve. Seules les vidéos téléchargées après ce changement ont des sous-titres.',
  srvDeleteTitle: 'Effacer les fichiers',
  srvDeleteText:
    'Par défaut (<code>DELETE_FILE_ON_TRASHCAN=false</code>), MeTube ne retire que l’entrée de sa liste et garde le fichier. Pour que le bouton de suppression du lecteur efface les fichiers, ajoutez la ligne ci-dessous. <code>true</code> marche aussi, mais alors la corbeille de MeTube efface toujours les fichiers elle aussi. Avec la valeur par défaut, le lecteur vous dit que le fichier a été gardé.',
  srvHttpsTitle: 'HTTPS',
  srvHttpsText:
    'YouTube est une page HTTPS, et les navigateurs refusent d’y charger de la vidéo en <code>http://</code>. MeTube doit être joignable en <code>https://</code>, par exemple via Traefik avec un certificat. <code>localhost</code> est la seule exception.',
  srvUrlsTitle: 'URL de téléchargement par défaut',
  srvUrlsText:
    'Le lecteur attend les URL de fichiers standard de MeTube : <code>{URL MeTube}/download/…</code>, ou <code>/audio_download/…</code> pour l’audio. Si vous avez changé <code>PUBLIC_HOST_URL</code> pour servir les fichiers d’ailleurs, le lecteur ne les trouvera pas.',
  srvEntryTitle: 'Une entrée par vidéo',
  srvEntryText:
    'MeTube garde une entrée d’historique par URL de vidéo. Télécharger l’audio ou les sous-titres d’une vidéo déjà téléchargée remplace son entrée (le fichier vidéo reste sur le disque) ; le lecteur ne retrouve alors plus la vidéo et la téléchargerait à nouveau. Pour des sous-titres à regarder, préférez <code>YTDL_OPTIONS</code> ; utilisez le bloc sous-titres du menu pour obtenir les fichiers eux-mêmes.',
  srvFormatsTitle: 'Formats',
  srvFormatsText:
    'Le navigateur doit savoir lire le fichier. MP4 (H.264/AAC) et WebM passent partout. Si vous obtenez <i>impossible de lire ce fichier</i>, mettez le format vidéo par défaut sur <b>MP4</b> dans les réglages.',
  composeTitle: 'Exemple de docker-compose.yml',
  composeText: 'Un service MeTube avec tout ce que l’extension sait utiliser. Placez-le derrière votre reverse proxy HTTPS.',
  linksTitle: 'Comment MeTube traite certains liens',
  linksT:
    '<b>Horodatages <code>t=</code></b> : les versions actuelles de MeTube transforment un paramètre <code>t</code> en début d’extrait, donc <code>watch?v=…&amp;t=90</code> télécharge à partir de 1:30. Pour la vidéo entière, envoyez un lien sans <code>t</code>.',
  linksList:
    '<b>Vidéos ouvertes depuis une playlist</b> (<code>watch?v=…&amp;list=…</code>) : la fenêtre les marque <b>Dans une playlist</b>. Que MeTube télécharge seulement cette vidéo ou toute la playlist dépend de son <i>mode playlist strict</i> (<code>DEFAULT_OPTION_PLAYLIST_STRICT_MODE</code>).',
  linksPrivate:
    'Les listes privées qui exigent votre connexion YouTube sont ignorées : À regarder plus tard (<code>WL</code>), Vidéos aimées (<code>LL</code>) et Musique aimée (<code>LM</code>).',

  // Troubleshooting
  tsKicker: 'Dépannage',
  tsTitle: 'Ce que veut dire le message, et quoi faire.',
  tsPopup: 'Fenêtre :',
  tsPlayer: 'Lecteur :',
  ts1q: 'Échec de l’authentification (401)',
  ts1a: 'Vérifiez le nom d’utilisateur et le mot de passe dans les réglages.',
  ts2q: 'Hôte injoignable',
  ts2a: 'L’URL est fausse, le serveur est arrêté, ou il est injoignable depuis cette machine (VPN, DNS, certificat TLS).',
  ts3q: 'Introuvable (404)',
  ts3a: 'Il manque le préfixe de chemin de MeTube à l’URL, ou elle pointe vers le mauvais service.',
  ts4q: 'MeTube a refusé la requête (400) : …',
  ts4a: 'MeTube a refusé les options ; la raison vient de MeTube. Exemple : un dossier est réglé mais <code>CUSTOM_DIRS</code> est désactivé.',
  ts5q: 'n’a pas répondu en JSON',
  ts5a:
    'Autre chose que MeTube a répondu, comme une page de connexion d’Authelia ou d’Authentik, ou une page d’erreur de proxy. L’authentification basique est la seule méthode de connexion que cette extension prend en charge.',
  ts6q: 'accès non autorisé à …',
  ts6a:
    'Ouvrez les réglages et cliquez sur <b>Enregistrer</b>, puis <b>Autoriser</b>. Si aucune demande n’apparaît, allez sur la page <b>Détails</b> de l’extension → <b>Accès au site</b> et ajoutez votre site MeTube.',
  ts7q: 'Impossible d’analyser cette page',
  ts7a:
    'Les pages du navigateur (<code>chrome://</code>, <code>arc://</code>, le Web Store) ne peuvent pas être lues par les extensions. <b>Envoyer la page</b> marche toujours pour les pages web normales.',
  ts8q: 'MeTube n’a pas pu télécharger cette vidéo',
  ts8a: 'L’erreur de MeTube est affichée dessous (privée, limite d’âge, supprimée…). <b>Réessayer</b> rajoute la vidéo.',
  ts9q: 'le fichier n’est plus sur le serveur',
  ts9a: 'Le téléchargement a été supprimé du disque mais est toujours dans l’historique de MeTube. <b>Télécharger à nouveau</b> le rajoute.',
  ts10q: 'refuse de charger de la vidéo http://',
  ts10a: 'Servez MeTube en HTTPS (voir <a href="#server">Réglage du serveur</a>).',
  ts11q: 'impossible de lire ce fichier',
  ts11a: 'Le navigateur ne prend pas en charge le format du fichier. Mettez le format vidéo par défaut sur <b>MP4</b>.',
  ts12q: 'pas de sous-titres',
  ts12a:
    'Vérifiez <code>YTDL_OPTIONS</code> (voir <a href="#server">Réglage du serveur</a>), et que les langues correspondent. Les vidéos téléchargées avant le changement n’en ont pas.',
  ts13q: 'le serveur a gardé le fichier',
  ts13a: 'MeTube a retiré l’entrée mais pas le fichier : lancez-le avec <code>DELETE_FILE_ON_TRASHCAN=ask</code>.',
  ts14q: 'Une entrée du menu manque',
  ts14a:
    'Vérifiez <b>Menu du clic droit</b> dans les réglages (bloc désactivé, qualité non cochée, contexte décoché). Les sous-titres ont besoin d’au moins une <b>Langue des sous-titres</b>.',
  ts15q: 'Le raccourci ne fait rien',
  ts15a:
    'Une autre extension l’utilise peut-être : réglez-en un autre (voir <a href="#install">Raccourci clavier</a>). Il ne marche que sur les pages <code>youtube.com/watch?v=…</code>.',

  // Privacy
  privKicker: 'Permissions et vie privée',
  privTitle: 'Rien ne sort de votre navigateur, sauf vers votre MeTube.',
  privLead:
    'Chaque appel réseau est fait par le service worker en arrière-plan, jamais par les pages que vous visitez. La page du lecteur est le seul fichier que les pages YouTube peuvent charger depuis l’extension.',
  permMenus: 'Les menus du clic droit, y compris celui de l’icône de l’extension.',
  permStorage: 'Enregistrer les réglages, et mémoriser la dernière erreur pour la fenêtre.',
  permScripting:
    'Lire les liens de l’onglet courant, et y ouvrir le lecteur, seulement après que vous ouvrez la fenêtre, utilisez une entrée de menu ou appuyez sur le raccourci.',
  permNotif: 'Les notifications de résultat, quand le navigateur les affiche.',
  permDnr:
    'La règle qui ajoute vos identifiants aux requêtes vidéo du lecteur. Contrairement à <code>declarativeNetRequest</code>, elle n’agit que sur les hôtes que vous avez autorisés, et n’ajoute aucun avertissement à l’installation.',
  permYoutube: 'Analyser les pages YouTube à la recherche de liens, et y ouvrir le lecteur.',
  permHostName: 'Votre hôte MeTube',
  permHost: 'Facultatif, demandé à l’enregistrement. Envoyer les requêtes à MeTube.',

  // Development
  devKicker: 'Développement',
  devTitle: 'Du JavaScript brut. Clonez, chargez, bidouillez.',
  devLead:
    'Pas de build, aucune dépendance à installer. La seule bibliothèque, <a href="https://github.com/muxinc/media-chrome">Media Chrome</a> pour le lecteur, est embarquée (le Manifest V3 interdit de charger du code depuis Internet). Les tests demandent Node 22+.',
  devRunTitle: 'Tester et construire',
  devRunText:
    'Le workflow CI lance les tests et construit le zip à chaque pull request et chaque push sur <code>main</code>. Le zip reste attaché à l’exécution 14 jours, pour essayer un changement avant sa publication.',
  devReleaseTitle: 'Publier une version',
  devReleaseText:
    'Les versions ne sont créées que depuis un tag de version sur <code>main</code>. Le workflow Release lance les tests, construit le zip avec cette version écrite dans son <code>manifest.json</code>, et publie une release GitHub avec le zip, sa somme SHA-256 et des notes tirées des pull requests fusionnées.',
  devTreeTitle: 'Où sont les choses',
  treeBackground: 'entrée du service worker : enregistre les écouteurs, route les messages',
  treeSw: 'menus, envoi, retour, requêtes du lecteur, la règle d’authentification',
  treeLib: 'réglages, i18n, modèle du menu, client de l’API MeTube, historique, URL YouTube',
  treeContent: 'injecté dans YouTube à la demande : l’iframe du lecteur, la pause, la navigation',
  treeOverlay: 'la page du lecteur affichée dans cette iframe',
  treeUi: 'fenêtre de la barre d’outils, page des réglages, thème sombre partagé',
  treeLocales: 'messages en anglais (par défaut) et en français',
  treeVendor: 'Media Chrome (MIT), modules ES non modifiés',
  treeTests: 'traitement des URL, recherche dans l’historique, menus, messages, le manifest, ce site',
  treeDocs: 'ce site web (GitHub Pages)',

  // Footer
  footTagline: 'pour Chrome et Arc, par CostardRouge.',
  footReleases: 'Versions',
  footIssues: 'Tickets',
  footNote:
    'Cette page aussi est du HTML, du CSS et du JavaScript bruts, servis depuis le dossier <code>docs/</code> du dépôt. Sans lien avec YouTube ni Google.',
  copy: 'Copier',
};
