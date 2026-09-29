// Injected into a YouTube watch page on demand (keyboard shortcut or popup).
// Each injection toggles the overlay; its state lives on in this isolated
// world between injections.
//
// Robustness rule: everything comes from the URL (the video ID). The only
// page interaction is pausing the first <video> element and reading its
// currentTime. Nothing depends on YouTube's DOM structure or class names.

(() => {
  const HOST_KEY = '__metubeOverlayHost';
  if (window[HOST_KEY]) {
    window[HOST_KEY].toggle();
    return;
  }

  const OVERLAY_ORIGIN = new URL(chrome.runtime.getURL('')).origin;
  const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
  const RESUME_MIN_SECONDS = 5;

  // Inline !important styles: YouTube's CSS can't reach inside the iframe,
  // and can't restyle the iframe element itself either.
  const FRAME_STYLE = {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    'max-width': 'none',
    'max-height': 'none',
    margin: '0',
    padding: '0',
    border: '0',
    display: 'block',
    'z-index': '2147483647',
    background: 'transparent',
    // Must match the overlay page's scheme, or Chrome paints the frame opaque.
    'color-scheme': 'dark',
    opacity: '1',
    visibility: 'visible',
    transform: 'none',
    'pointer-events': 'auto',
  };

  let frame = null;
  let openVideoId = null;
  let pausedVideo = null;
  let urlTimer = null;

  function currentVideoId() {
    if (location.pathname !== '/watch') return null;
    const id = new URLSearchParams(location.search).get('v');
    return id && VIDEO_ID_RE.test(id) ? id : null;
  }

  // YouTube may resume by itself (autoplay, end of an ad): stay paused.
  function keepPaused() {
    pausedVideo?.pause();
  }

  function onMessage(event) {
    if (!frame || event.source !== frame.contentWindow || event.origin !== OVERLAY_ORIGIN) return;
    if (event.data?.type === 'metube-overlay:close') close();
  }

  // Only fires while focus is on YouTube's page, not inside the overlay.
  function onKeyDown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    // Keep YouTube's own shortcuts away from its hidden player.
    event.stopImmediatePropagation();
    event.preventDefault();
    if (event.key === 'Escape') close();
    else frame?.focus();
  }

  // SPA navigation to another video (or away from /watch) closes the overlay.
  function checkUrl() {
    if (frame && currentVideoId() !== openVideoId) close();
  }

  function open() {
    const videoId = currentVideoId();
    if (!videoId) return;

    const params = new URLSearchParams({ v: videoId });
    const video = document.querySelector('video');
    if (video) {
      video.pause();
      if (video.currentTime > RESUME_MIN_SECONDS) params.set('t', String(Math.floor(video.currentTime)));
      video.addEventListener('play', keepPaused);
      pausedVideo = video;
    } else {
      params.set('novideo', '1');
    }

    frame = document.createElement('iframe');
    frame.src = `${chrome.runtime.getURL('overlay/overlay.html')}?${params}`;
    frame.allow = 'autoplay; fullscreen; picture-in-picture';
    frame.setAttribute('allowfullscreen', '');
    frame.title = 'MeTube player';
    for (const [property, value] of Object.entries(FRAME_STYLE)) {
      frame.style.setProperty(property, value, 'important');
    }
    document.documentElement.append(frame);
    frame.focus();
    openVideoId = videoId;

    window.addEventListener('message', onMessage);
    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('yt-navigate-finish', checkUrl);
    window.addEventListener('popstate', checkUrl);
    urlTimer = setInterval(checkUrl, 1000);
  }

  // Closing never resumes YouTube's player.
  function close() {
    frame?.remove();
    frame = null;
    openVideoId = null;
    pausedVideo?.removeEventListener('play', keepPaused);
    pausedVideo = null;
    clearInterval(urlTimer);
    window.removeEventListener('message', onMessage);
    window.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('yt-navigate-finish', checkUrl);
    window.removeEventListener('popstate', checkUrl);
  }

  function toggle() {
    if (frame) close();
    else open();
  }

  window[HOST_KEY] = { toggle };
  toggle();
})();
