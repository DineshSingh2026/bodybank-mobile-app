/*
 * BodyBank App: store update alert (Android + iOS builds only).
 *
 * Injected by scripts/build-www.js right after bb-app-config.js on every page.
 * On the plain web / PWA (window.IS_BODYBANK_APP !== true) it does nothing.
 *
 * On launch (DOMContentLoaded) and on resume it asks
 *   GET https://www.bodybank.fit/api/app/version   (routes/appVersion.js in the web repo)
 * and compares the installed version (@capacitor/app getInfo) with it:
 *   below min_supported_version, or force on and below latest → full screen "Update required"
 *   below latest                                                → dismissible card (3 days)
 * Android uses Play In-App Updates (@capawesome/capacitor-app-update) when Play
 * offers the update; otherwise, and always on iOS, the buttons open the store page.
 *
 * FAIL OPEN: a network error, timeout, non 200, bad JSON, enabled:false or an
 * unparseable version shows nothing. A cached response (24 h) is used offline for
 * the soft card only, never to newly block someone. A force screen already up
 * (decided online) stays, with an offline note.
 *
 * parseSemver / compareSemver / evaluate are a copy of
 * bodybank/services/appVersionService.js; keep the two in step
 * (bodybank/tests/app-version-unit.js checks they agree).
 *
 * Public: window.bbAppUpdate = { check, openStore, state }
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------ pure core */

  var DISMISS_KEY = 'bb_update_dismissed';
  var CACHE_KEY = 'bb_app_version_cache';
  var DISMISS_MS = 3 * 24 * 60 * 60 * 1000;
  var CACHE_MS = 24 * 60 * 60 * 1000;
  var THROTTLE_MS = 30 * 60 * 1000;
  var TIMEOUT_MS = 5000;

  function parseSemver(str) {
    if (str == null) return null;
    var s = String(str).trim();
    var m = /^v?(\d{1,6})(?:\.(\d{1,6}))?(?:\.(\d{1,6}))?(?=$|[\s(+-])/i.exec(s);
    if (!m) return null;
    return [Number(m[1]), Number(m[2] || 0), Number(m[3] || 0)];
  }

  function compareSemver(a, b) {
    var pa = Array.isArray(a) ? a : parseSemver(a);
    var pb = Array.isArray(b) ? b : parseSemver(b);
    if (!pa || !pb) return 0;
    for (var i = 0; i < 3; i++) {
      if (pa[i] > pb[i]) return 1;
      if (pa[i] < pb[i]) return -1;
    }
    return 0;
  }

  function evaluate(platform, currentVersion, cfg) {
    var p = cfg && cfg[platform];
    var cur = parseSemver(currentVersion);
    if (!p || (platform !== 'ios' && platform !== 'android') || !cur) return { status: 'ok' };
    var latest = parseSemver(p.latest_version);
    var min = parseSemver(p.min_supported_version);
    if (min && compareSemver(cur, min) < 0) return { status: 'force' };
    if (latest && compareSemver(cur, latest) < 0) return { status: p.force === true ? 'force' : 'soft' };
    return { status: 'ok' };
  }

  /** Soft card again? Never dismissed, a newer latest than the one dismissed, or 3 days passed. */
  function shouldShowSoft(dismissed, latest, now) {
    if (!dismissed || typeof dismissed !== 'object' || !dismissed.version) return true;
    if (compareSemver(latest, dismissed.version) > 0) return true;
    var at = Number(dismissed.at);
    if (!isFinite(at)) return true;
    return (now - at) >= DISMISS_MS;
  }

  /** A cached response usable offline (soft card only)? */
  function cacheUsable(cache, now) {
    return !!(cache && cache.data && cache.data.enabled === true && isFinite(Number(cache.at)) && (now - Number(cache.at)) < CACHE_MS && (now - Number(cache.at)) >= 0);
  }

  var CORE = {
    parseSemver: parseSemver, compareSemver: compareSemver, evaluate: evaluate,
    shouldShowSoft: shouldShowSoft, cacheUsable: cacheUsable,
    DISMISS_MS: DISMISS_MS, CACHE_MS: CACHE_MS, THROTTLE_MS: THROTTLE_MS,
    DISMISS_KEY: DISMISS_KEY, CACHE_KEY: CACHE_KEY
  };
  if (typeof module !== 'undefined' && module && module.exports) module.exports = CORE;

  /* ------------------------------------------------------------ app only */

  if (typeof window === 'undefined' || window.IS_BODYBANK_APP !== true) return;
  if (window.bbAppUpdate) return;

  var COPY = {
    softTitle: 'A new version is ready',
    softBody: 'Get the latest improvements to BodyBank.',
    update: 'Update',
    later: 'Later',
    forceTitle: 'Update required',
    forceBody: 'This version of BodyBank is no longer supported. Update to keep training with us.',
    updateNow: 'Update now',
    readyTitle: 'Update downloaded',
    readyBody: 'Update ready. Restart to finish.',
    restart: 'Restart',
    offline: 'You are offline. Connect to the internet to update.'
  };

  var ICON_DL = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';
  var ICON_REFRESH = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>';

  var S = {
    platform: null, current: null, build: null,
    data: null, status: 'ok', fromCache: false,
    lastCheckAt: 0, inFlight: null,
    shown: null,            // null | 'soft' | 'force' | 'ready'
    softPending: false, ticker: null,
    play: null,             // last AppUpdate.getAppUpdateInfo() result (Android)
    flexListener: false, immediateTried: false,
    backHandle: null
  };

  function plugins() { var c = window.Capacitor; return (c && c.Plugins) || {}; }
  function lsGet(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function track(name, params) {
    try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) { /* analytics never blocks */ }
  }
  function log() { try { console.log.apply(console, ['[BodyBank App] update:'].concat([].slice.call(arguments))); } catch (e) { /* ignore */ } }

  function platformName() {
    try {
      var p = window.Capacitor && typeof window.Capacitor.getPlatform === 'function' ? window.Capacitor.getPlatform() : '';
      return (p === 'ios' || p === 'android') ? p : null;
    } catch (e) { return null; }
  }

  function readInstalledVersion() {
    var App = plugins().App;
    if (!App || typeof App.getInfo !== 'function') return Promise.resolve(null);
    return App.getInfo().then(function (info) {
      return info && info.version ? { version: String(info.version), build: info.build != null ? String(info.build) : '' } : null;
    }, function () { return null; });
  }

  /* ---------------------------------------------------------- network */

  function fetchConfig() {
    // bb-app-config.js always sets API_BASE in the app; '' (same origin) is honoured too.
    var base = typeof window.API_BASE === 'string' ? window.API_BASE : 'https://www.bodybank.fit';
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = null;
    var headers = { Accept: 'application/json' };
    try { var u = window.currentUser; if (u && u.token) headers.Authorization = 'Bearer ' + u.token; } catch (e) { /* ignore */ }
    var req = fetch(base + '/api/app/version', { method: 'GET', headers: headers, signal: ctrl ? ctrl.signal : undefined, credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('http_' + r.status);
        return r.json().catch(function () { throw new Error('bad_json'); });
      })
      .then(function (d) {
        if (!d || typeof d !== 'object' || typeof d.enabled !== 'boolean') throw new Error('bad_json');
        return d;
      });
    var timeout = new Promise(function (_, reject) {
      timer = setTimeout(function () { try { if (ctrl) ctrl.abort(); } catch (e) { /* ignore */ } reject(new Error('timeout')); }, TIMEOUT_MS);
    });
    return Promise.race([req, timeout]).then(
      function (d) { clearTimeout(timer); return d; },
      function (e) {
        clearTimeout(timer);
        var msg = String((e && e.message) || '');
        var reason = /^http_|^bad_json$|^timeout$/.test(msg) ? msg : (e && e.name === 'AbortError' ? 'timeout' : 'network');
        throw new Error(reason);
      }
    );
  }

  /* ---------------------------------------------------------- styles */

  function injectStyles() {
    if (document.getElementById('bb-app-update-styles')) return;
    var s = document.createElement('style');
    s.id = 'bb-app-update-styles';
    s.textContent =
      // Soft card: brand mark + version, copy, then a divided action bar.
      '#bb-app-update-card{position:fixed;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:10030;' +
      'max-width:440px;margin:0 auto;box-sizing:border-box;overflow:hidden;border-radius:18px;' +
      'background:linear-gradient(180deg,rgba(26,24,20,.97),rgba(16,16,16,.97));-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);' +
      'border:1px solid rgba(200,164,78,.24);box-shadow:0 22px 50px rgba(0,0,0,.6),0 2px 8px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.04);' +
      'font-family:inherit;color:#f5f5f5;transform:translateY(20px) scale(.985);opacity:0;transition:transform .38s cubic-bezier(.2,.8,.2,1),opacity .28s ease}' +
      '#bb-app-update-card::before{content:"";position:absolute;top:0;left:18px;right:18px;height:1px;background:linear-gradient(90deg,transparent,rgba(228,187,90,.75),transparent)}' +
      '#bb-app-update-card.is-in{transform:none;opacity:1}' +
      '#bb-app-update-card[hidden]{display:none!important}' +
      '#bb-app-update-card .bbau-main{display:flex;align-items:flex-start;gap:14px;padding:16px 18px 14px}' +
      '#bb-app-update-card .bbau-mark{flex-shrink:0;width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:#0a0a0a;border:1px solid rgba(200,164,78,.3);box-shadow:inset 0 0 0 1px rgba(0,0,0,.6)}' +
      '#bb-app-update-card .bbau-mark img{width:34px;height:34px;object-fit:contain;mix-blend-mode:lighten}' +
      '#bb-app-update-card .bbau-copy{flex:1;min-width:0}' +
      '#bb-app-update-card .bbau-copy{align-self:center}' +
      '#bb-app-update-card .bbau-copy strong{display:block;font-size:15.5px;font-weight:700;color:#f7f4ee;line-height:1.25;letter-spacing:.005em}' +
      '#bb-app-update-card .bbau-copy p{margin:5px 0 0;font-size:13px;line-height:1.45;color:#a9a6a0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}' +
      '#bb-app-update-card .bbau-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:10px 12px 12px 18px;border-top:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.18)}' +
      '.bbau-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:12px;padding:0 18px;font-weight:700;cursor:pointer;font-size:13.5px;letter-spacing:.01em;border:none;font-family:inherit;min-height:40px;-webkit-tap-highlight-color:transparent;transition:filter .15s,background .15s,transform .1s}' +
      '.bbau-btn:active{transform:scale(.97)}' +
      '.bbau-btn svg{width:16px;height:16px;flex-shrink:0}' +
      '.bbau-primary{min-width:112px;background:linear-gradient(180deg,#f0cd72,#c8a44e);color:#15110a;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 6px 16px rgba(200,164,78,.22)}' +
      '.bbau-primary:hover{filter:brightness(1.06)}' +
      '.bbau-ghost{background:transparent;color:#b8b5ae}' +
      '.bbau-ghost:hover{background:rgba(255,255,255,.05);color:#e6e3dc}' +
      '@media (prefers-reduced-motion:reduce){#bb-app-update-card{transition:opacity .2s ease;transform:none}}' +
      '#bb-app-force{position:fixed;inset:0;z-index:100600;background:#0a0a0a;display:flex;align-items:center;justify-content:center;box-sizing:border-box;' +
      'padding:max(24px,env(safe-area-inset-top)) max(24px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(24px,env(safe-area-inset-left));font-family:inherit;color:#f5f5f5;overscroll-behavior:contain;touch-action:none}' +
      '#bb-app-force .bbau-panel{width:100%;max-width:380px;background:#141414;border:1px solid rgba(200,164,78,.35);border-radius:18px;padding:28px 24px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.55);touch-action:auto}' +
      '#bb-app-force .bbau-logo{height:56px;width:auto;object-fit:contain;mix-blend-mode:lighten;display:block;margin:0 auto 18px}' +
      '#bb-app-force .bbau-ico{width:48px;height:48px;border-radius:50%;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;color:#e4bb5a;background:rgba(200,164,78,.12);border:1px solid rgba(200,164,78,.3)}' +
      '#bb-app-force h2{margin:0 0 8px;color:#e4bb5a;font-size:1.25rem;font-weight:700}' +
      '#bb-app-force p{margin:0 0 22px;color:#aaa;font-size:14px;line-height:1.5}' +
      '#bb-app-force .bbau-btn{width:100%;min-height:48px;font-size:15px}' +
      '.bbau-btn:focus{outline:none}' +
      '.bbau-btn:focus-visible{outline:2px solid #e4bb5a;outline-offset:3px}' +
      '#bb-app-force .bbau-offline{margin:14px 0 0;font-size:12.5px;color:#e4bb5a}' +
      '#bb-app-force .bbau-offline[hidden]{display:none}' +
      'body.bbau-force-open{overflow:hidden!important}';
    document.head.appendChild(s);
  }

  /* ---------------------------------------------------------- visibility rules */

  function isVisible(el) {
    if (!el) return false;
    try {
      if (!el.getClientRects().length) return false;
      var cs = window.getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0;
    } catch (e) { return false; }
  }

  /** Reasons to hold the soft card back for now (it comes back once they clear). */
  function softBlocked() {
    var path = String(location.pathname || '').toLowerCase();
    if (/(^|\/)(signin|signup)(\.html)?$/.test(path)) return 'auth_page';
    if (document.querySelector('.modal-overlay.open')) return 'modal';
    var pop = document.querySelectorAll('.popup-overlay');
    for (var i = 0; i < pop.length; i++) if (isVisible(pop[i])) return 'modal';
    if (isVisible(document.getElementById('usec-coach'))) return 'coach_mode';
    if (isVisible(document.getElementById('bb-update-modal'))) return 'pwa_modal';
    if (S.shown === 'force') return 'force';
    return '';
  }

  // Sit above the member bottom nav and any WhatsApp button in the corner. With
  // neither on screen the CSS default (16px or the safe area inset) applies.
  function placeCard(card) {
    var lift = 0;
    var vh = window.innerHeight;
    var nav = document.getElementById('userBottomNav');
    if (isVisible(nav)) lift = Math.max(lift, vh - nav.getBoundingClientRect().top + 10);
    var fabs = document.querySelectorAll('.wa-public-fab, .admin-ai-wa-fab-wrap');
    for (var i = 0; i < fabs.length; i++) {
      if (isVisible(fabs[i])) lift = Math.max(lift, vh - fabs[i].getBoundingClientRect().top + 10);
    }
    card.style.bottom = lift > 0 ? Math.round(lift) + 'px' : '';
  }

  /* ---------------------------------------------------------- soft card */

  function cardEl() { return document.getElementById('bb-app-update-card'); }

  function renderCard(kind) {
    injectStyles();
    var p = S.data && S.data[S.platform];
    var notes = (p && p.release_notes) ? String(p.release_notes) : '';
    var title = kind === 'ready' ? COPY.readyTitle : COPY.softTitle;
    var body = kind === 'ready' ? COPY.readyBody : (notes || COPY.softBody);
    var el = cardEl();
    if (!el) {
      el = document.createElement('div');
      el.id = 'bb-app-update-card';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-labelledby', 'bbauCardTitle');
      document.body.appendChild(el);
      el.addEventListener('click', onCardClick);
    }
    el.setAttribute('data-kind', kind);
    el.innerHTML =
      '<div class="bbau-main">' +
      '<div class="bbau-mark" aria-hidden="true"><img src="/img/Bodybank%20logo.png" alt=""></div>' +
      '<div class="bbau-copy">' +
      '<strong id="bbauCardTitle">' + esc(title) + '</strong><p>' + esc(body) + '</p></div>' +
      '</div>' +
      '<div class="bbau-foot">' +
      (kind === 'ready'
        ? '<button type="button" class="bbau-btn bbau-primary" data-act="restart">' + ICON_REFRESH + esc(COPY.restart) + '</button>'
        : '<button type="button" class="bbau-btn bbau-ghost" data-act="later">' + esc(COPY.later) + '</button>' +
          '<button type="button" class="bbau-btn bbau-primary" data-act="update">' + ICON_DL + esc(COPY.update) + '</button>') +
      '</div>';
    el.hidden = false;
    placeCard(el);
    requestAnimationFrame(function () { el.classList.add('is-in'); });
    return el;
  }

  function hideCard() {
    var el = cardEl();
    if (!el) return;
    el.classList.remove('is-in');
    el.hidden = true;
  }

  function startTicker() {
    if (S.ticker) return;
    S.ticker = setInterval(tick, 3000);
  }
  function stopTicker() { if (S.ticker) { clearInterval(S.ticker); S.ticker = null; } }

  // While a soft / ready card is wanted, keep it out of the way of sign in, modals and
  // a Coach Mode workout, and bring it back once they close.
  function tick() {
    if (!S.softPending) { stopTicker(); return; }
    var blocked = softBlocked();
    var el = cardEl();
    var shownNow = el && !el.hidden;
    if (blocked && shownNow) { hideCard(); return; }
    if (!blocked && !shownNow) { reallyShowSoft(); return; }
    if (shownNow) placeCard(el);
  }

  function reallyShowSoft() {
    var kind = S.shown === 'ready' ? 'ready' : 'soft';
    var firstTime = !cardEl() || cardEl().hidden;
    renderCard(kind);
    if (firstTime) track('app_update_prompt_shown', { type: kind === 'ready' ? 'ready' : 'soft', platform: S.platform });
  }

  function wantSoft(kind) {
    if (S.shown === 'force') return;
    S.shown = kind;
    S.softPending = true;
    if (!softBlocked()) reallyShowSoft();
    startTicker();
  }

  function dropSoft() {
    S.softPending = false;
    stopTicker();
    hideCard();
    if (S.shown === 'soft' || S.shown === 'ready') S.shown = null;
  }

  function onCardClick(ev) {
    var b = ev.target && ev.target.closest && ev.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'later') {
      var p = S.data && S.data[S.platform];
      lsSet(DISMISS_KEY, { version: (p && p.latest_version) || S.current, at: Date.now() });
      track('app_update_dismissed', { platform: S.platform, current: S.current, latest: p && p.latest_version });
      dropSoft();
    } else if (act === 'update') {
      track('app_update_clicked', { type: 'soft', platform: S.platform });
      startSoftUpdate();
    } else if (act === 'restart') {
      track('app_update_clicked', { type: 'restart', platform: S.platform });
      var AU = plugins().AppUpdate;
      if (AU && typeof AU.completeFlexibleUpdate === 'function') {
        AU.completeFlexibleUpdate().catch(function () { openStore(); });
      } else openStore();
    }
  }

  /* ---------------------------------------------------------- force screen */

  function forceEl() { return document.getElementById('bb-app-force'); }

  function syncOffline() {
    var el = forceEl();
    if (!el) return;
    var off = el.querySelector('.bbau-offline');
    if (off) off.hidden = navigator.onLine !== false;
  }

  function showForce() {
    injectStyles();
    dropSoft();
    var first = S.shown !== 'force';
    S.shown = 'force';
    // Never two update dialogs at once: the PWA modal yields.
    var pwa = document.getElementById('bb-update-modal');
    if (pwa) { pwa.classList.add('bb-pwa-modal-hidden'); pwa.setAttribute('aria-hidden', 'true'); }
    var el = forceEl();
    if (!el) {
      el = document.createElement('div');
      el.id = 'bb-app-force';
      el.setAttribute('role', 'alertdialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-labelledby', 'bbauForceTitle');
      el.setAttribute('aria-describedby', 'bbauForceBody');
      el.innerHTML =
        '<div class="bbau-panel">' +
        '<img class="bbau-logo" src="/img/Bodybank%20logo.png" alt="BodyBank">' +
        '<div class="bbau-ico">' + ICON_DL + '</div>' +
        '<h2 id="bbauForceTitle">' + esc(COPY.forceTitle) + '</h2>' +
        '<p id="bbauForceBody">' + esc(COPY.forceBody) + '</p>' +
        '<button type="button" class="bbau-btn bbau-primary" data-act="force-update">' + esc(COPY.updateNow) + '</button>' +
        '<p class="bbau-offline" role="status" hidden>' + esc(COPY.offline) + '</p>' +
        '</div>';
      el.addEventListener('click', function (ev) {
        var b = ev.target && ev.target.closest && ev.target.closest('[data-act="force-update"]');
        if (!b) return;
        track('app_update_clicked', { type: 'force', platform: S.platform });
        startForceUpdate(true);
      });
      // Swallow scroll / touch underneath.
      el.addEventListener('touchmove', function (ev) { if (ev.target === el) ev.preventDefault(); }, { passive: false });
      document.body.appendChild(el);
    }
    el.hidden = false;
    document.body.classList.add('bbau-force-open');
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) { /* ignore */ }
    try { el.querySelector('[data-act="force-update"]').focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    syncOffline();
    blockBack(true);
    if (first) {
      track('app_update_prompt_shown', { type: 'force', platform: S.platform });
      // Android: offer Play's immediate update right away, once per launch.
      if (S.platform === 'android' && !S.immediateTried) { S.immediateTried = true; startForceUpdate(false); }
    }
  }

  function hideForce() {
    var el = forceEl();
    if (el) el.parentNode.removeChild(el);
    document.body.classList.remove('bbau-force-open');
    blockBack(false);
    if (S.shown === 'force') S.shown = null;
  }

  // Android hardware back does nothing while the force screen is up.
  function blockBack(on) {
    var App = plugins().App;
    if (!App || typeof App.addListener !== 'function') return;
    // addListener returns a promise of the handle; keep the promise so a quick
    // show then hide still removes the listener once it resolves.
    if (on && !S.backHandle) {
      try {
        S.backHandle = Promise.resolve(App.addListener('backButton', function () { /* blocked while an update is required */ }))
          .catch(function () { return null; });
      } catch (e) { S.backHandle = null; }
    } else if (!on && S.backHandle) {
      var pending = S.backHandle;
      S.backHandle = null;
      pending.then(function (h) { try { if (h && typeof h.remove === 'function') h.remove(); } catch (e) { /* ignore */ } });
    }
  }

  /* ---------------------------------------------------------- store + Play */

  function storeInfo() {
    var p = (S.data && S.data[S.platform]) || {};
    if (S.platform === 'ios') {
      var id = String(p.app_store_id || '6808102656').replace(/\D/g, '') || '6808102656';
      return { id: id, native: 'itms-apps://apps.apple.com/app/id' + id, https: p.store_url || ('https://apps.apple.com/app/id' + id) };
    }
    var pkg = String(p.package || 'com.bodybank.app');
    // No hard-coded store URL: this file also ships in the iOS bundle, where
    // scripts/ios-strip-store-refs.js fails the build on any Play reference.
    // The server always sends store_url, and openAppStore falls back natively.
    return { pkg: pkg, native: 'market://details?id=' + pkg, https: p.store_url || '' };
  }

  // Capacitor hands window.open to the OS (iOS: UIApplication.open, Android: ACTION_VIEW).
  function openUrl(url) {
    try { window.open(url, '_system'); return true; } catch (e) { /* fall through */ }
    try { location.href = url; return true; } catch (e) { return false; }
  }

  function openStore() {
    var info = storeInfo();
    var AU = plugins().AppUpdate;
    if (AU && typeof AU.openAppStore === 'function') {
      var opts = S.platform === 'ios' ? { appId: info.id } : { androidPackageName: info.pkg };
      return AU.openAppStore(opts).catch(function () { fallbackOpen(info); });
    }
    fallbackOpen(info);
    return Promise.resolve();
  }

  function fallbackOpen(info) {
    // iOS always has the App Store app, so itms-apps is safe. On Android a market://
    // link fails silently without Play, so the https page (Play app or browser) is used.
    if (S.platform === 'ios') { if (!openUrl(info.native)) openUrl(info.https); }
    else openUrl(info.https || info.native);
  }

  function playInfo() {
    var AU = plugins().AppUpdate;
    if (S.platform !== 'android' || !AU || typeof AU.getAppUpdateInfo !== 'function') return Promise.resolve(null);
    return AU.getAppUpdateInfo().then(function (i) { S.play = i || null; return S.play; }, function () { S.play = null; return null; });
  }

  // Play says an update can be installed (not sideloaded, store build visible to this device).
  function playHasUpdate(i) { return !!(i && Number(i.updateAvailability) === 2); }

  function bindFlexible() {
    var AU = plugins().AppUpdate;
    if (S.flexListener || !AU || typeof AU.addListener !== 'function') return;
    S.flexListener = true;
    try {
      AU.addListener('onFlexibleUpdateStateChange', function (st) {
        var code = Number(st && st.installStatus);
        if (code === 11) { log('flexible update downloaded'); wantSoft('ready'); }       // DOWNLOADED
        else if (code === 5 || code === 6) { log('flexible update failed or cancelled', code); }
      });
    } catch (e) { S.flexListener = false; }
  }

  function startSoftUpdate() {
    var AU = plugins().AppUpdate;
    if (S.platform !== 'android' || !AU) { openStore(); dropSoft(); return; }
    playInfo().then(function (i) {
      if (playHasUpdate(i) && i.flexibleUpdateAllowed && typeof AU.startFlexibleUpdate === 'function') {
        bindFlexible();
        dropSoft();
        return AU.startFlexibleUpdate().then(function (res) {
          var code = res && Number(res.code);
          // 0 OK (downloading, the listener shows Restart), 1 cancelled by the user.
          if (code !== 0 && code !== 1) openStore();
        }, function () { openStore(); });
      }
      openStore();
      dropSoft();
      return null;
    });
  }

  function startForceUpdate(userTap) {
    var AU = plugins().AppUpdate;
    if (S.platform !== 'android' || !AU || typeof AU.performImmediateUpdate !== 'function') {
      if (userTap) openStore();
      return;
    }
    playInfo().then(function (i) {
      if (playHasUpdate(i) && i.immediateUpdateAllowed) {
        return AU.performImmediateUpdate().then(function (res) {
          var code = res && Number(res.code);
          if (code !== 0 && code !== 1 && userTap) openStore();
        }, function () { if (userTap) openStore(); });
      }
      if (userTap) openStore();
      return null;
    });
  }

  /* ---------------------------------------------------------- decide */

  function apply(data, opts) {
    var o = opts || {};
    S.data = data;
    S.fromCache = !!o.fromCache;
    if (!data || data.enabled !== true) { dropSoft(); hideForce(); S.status = 'ok'; return; }
    var p = data[S.platform];
    var res = evaluate(S.platform, S.current, data);
    S.status = res.status;
    if (!o.quiet) track('app_update_check', { platform: S.platform, current: S.current, latest: p && p.latest_version, status: res.status, cached: !!o.fromCache });

    if (res.status === 'force' && !o.fromCache) { showForce(); return; }
    if (S.shown === 'force' && res.status !== 'force' && !o.fromCache) hideForce();
    if (res.status === 'ok') { if (S.shown !== 'ready') dropSoft(); return; }

    // soft (or a cached force, which offline may only ever show as soft)
    if (S.shown === 'force') return;
    if (S.shown === 'ready') return;
    if (S.platform === 'android') {
      playInfo().then(function (i) {
        if (i && Number(i.installStatus) === 11) { bindFlexible(); wantSoft('ready'); return; }
        if (shouldShowSoft(lsGet(DISMISS_KEY), p && p.latest_version, Date.now())) wantSoft('soft');
      });
      return;
    }
    if (shouldShowSoft(lsGet(DISMISS_KEY), p && p.latest_version, Date.now())) wantSoft('soft');
  }

  function check(reason) {
    if (!S.platform || !S.current) return Promise.resolve(null);
    var now = Date.now();
    if (reason === 'resume' && S.shown !== 'force' && (now - S.lastCheckAt) < THROTTLE_MS) return Promise.resolve(null);
    if (S.inFlight) return S.inFlight;
    S.lastCheckAt = now;
    S.inFlight = fetchConfig().then(function (data) {
      S.inFlight = null;
      if (data.enabled === true) lsSet(CACHE_KEY, { at: Date.now(), data: data });
      apply(data);
      return data;
    }, function (err) {
      S.inFlight = null;
      var why = (err && err.message) || 'network';
      track('app_update_check_failed', { reason: why, platform: S.platform });
      log('check failed (' + why + '), opening normally');
      if (S.shown === 'force') { syncOffline(); return null; }   // decided online earlier: keep it
      var cache = lsGet(CACHE_KEY);
      if (cacheUsable(cache, Date.now())) apply(cache.data, { fromCache: true });
      return null;
    });
    return S.inFlight;
  }

  function boot() {
    S.platform = platformName();
    if (!S.platform) return;
    readInstalledVersion().then(function (v) {
      if (!v || !parseSemver(v.version)) { log('installed version unknown, skipping'); return; }
      S.current = v.version;
      S.build = v.build;
      check('launch');
      var App = plugins().App;
      if (App && typeof App.addListener === 'function') {
        try { App.addListener('resume', function () { check('resume'); }); } catch (e) { /* ignore */ }
      }
    });
    window.addEventListener('online', function () { syncOffline(); if (S.shown === 'force') check('online'); });
    window.addEventListener('offline', syncOffline);
    window.addEventListener('resize', function () { var el = cardEl(); if (el && !el.hidden) placeCard(el); });
  }

  window.bbAppUpdate = {
    check: function () { return check('manual'); },
    openStore: openStore,
    state: S
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
