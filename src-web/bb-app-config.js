/*
 * BodyBank App — runtime config for the Capacitor (Android/iOS) build.
 *
 * Loaded FIRST on every page. When running inside the native app it:
 *   1. Sets window.API_BASE so app code can build absolute URLs explicitly.
 *   2. Monkey-patches fetch() and XMLHttpRequest.open() so that any
 *      existing call to /api/... or /uploads/... is auto-rewritten to
 *      https://www.bodybank.fit/...  (the WebView's own origin is
 *      https://localhost which has no backend).
 *   3. Skips PWA service-worker registration. The web PWA's SW would
 *      intercept requests inside the app and confuse caching.
 *
 * When running as a normal web page (PWA / browser) this script is a no-op,
 * so the same www/ tree could in theory be served from the web too — but
 * we don't do that; the canonical web build is still the bodybank/ repo.
 */
(function () {
  var API_BASE = 'https://www.bodybank.fit';

  function isNativeApp() {
    try {
      return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
    } catch (e) { return false; }
  }

  // Expose to app code regardless of platform (web pages will get API_BASE = '' below)
  if (!isNativeApp()) {
    window.API_BASE = '';
    window.IS_BODYBANK_APP = false;
    return;
  }

  window.API_BASE = API_BASE;
  window.IS_BODYBANK_APP = true;
  // Public-facing origin for building shareable links. On the web this would
  // be window.location.origin; inside the app that is https://localhost, so
  // expose the real public origin instead. Pages use:
  //   (window.BB_PUBLIC_ORIGIN || window.location.origin)
  window.BB_PUBLIC_ORIGIN = API_BASE;

  // ---- 1. Disable service worker registration inside the app ----
  try {
    if (navigator && navigator.serviceWorker && typeof navigator.serviceWorker.register === 'function') {
      navigator.serviceWorker.register = function () {
        return Promise.resolve({
          active: null, installing: null, waiting: null,
          unregister: function () { return Promise.resolve(true); },
          update: function () { return Promise.resolve(); },
          addEventListener: function () {}
        });
      };
    }
  } catch (e) { /* ignore */ }

  // ---- 2. URL rewrite helper ----
  // Rewrite ONLY backend paths. Local bundled assets (/js, /css, /img, /icons,
  // /manifest.json, /favicon.ico) must stay relative so the WebView loads them
  // from inside the APK.
  // `videos` is rewritten because mp4 marketing clips live on the web (~24 MB total) —
  // see scripts/build-www.js which skips public/videos/ to keep the app bundle slim.
  var BACKEND_PREFIX_RE = /^\/(api|uploads|webhook|webhooks|share|videos)(\/|$|\?)/i;
  // The app's own WebView origin. Some pages build absolute URLs with
  // window.location.origin + '/api/...', which resolves to https://localhost
  // inside the app and has no backend. Catch those too.
  var LOCAL_ORIGIN_RE = /^(https?|capacitor|ionic):\/\/localhost(:\d+)?/i;

  function rewriteIfBackend(url) {
    if (typeof url !== 'string') return url;
    // Case 1: relative backend path  ->  /api/part2
    if (BACKEND_PREFIX_RE.test(url)) return API_BASE + url;
    // Case 2: absolute URL built from the app's own origin
    //   https://localhost/api/part2  ->  https://www.bodybank.fit/api/part2
    if (LOCAL_ORIGIN_RE.test(url)) {
      var pathPart = url.replace(LOCAL_ORIGIN_RE, '');
      if (BACKEND_PREFIX_RE.test(pathPart)) return API_BASE + pathPart;
    }
    return url;
  }

  // ---- 3. Patch fetch ----
  if (typeof window.fetch === 'function') {
    var origFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      try {
        if (typeof input === 'string') {
          var rewritten = rewriteIfBackend(input);
          if (rewritten !== input) return origFetch(rewritten, init);
        } else if (input && typeof input.url === 'string') {
          var rewrittenUrl = rewriteIfBackend(input.url);
          if (rewrittenUrl !== input.url) {
            return origFetch(new Request(rewrittenUrl, input), init);
          }
        }
      } catch (e) { /* fall through */ }
      return origFetch(input, init);
    };
  }

  // ---- 4. Patch XMLHttpRequest ----
  if (typeof XMLHttpRequest !== 'undefined' && XMLHttpRequest.prototype && XMLHttpRequest.prototype.open) {
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      try {
        if (typeof url === 'string') {
          arguments[1] = rewriteIfBackend(url);
        }
      } catch (e) { /* ignore */ }
      return origOpen.apply(this, arguments);
    };
  }

  // ---- 5. One-time DOM pass + observer to fix <img src="/uploads/..."> ----
  // Static <img src="/img/..."> stays local; only backend-served media is rewritten.
  function fixElementUrls(el) {
    if (!el || el.nodeType !== 1) return;
    if (el.tagName === 'IMG' || el.tagName === 'SOURCE' || el.tagName === 'VIDEO' || el.tagName === 'AUDIO') {
      var src = el.getAttribute('src');
      if (src && BACKEND_PREFIX_RE.test(src)) {
        el.setAttribute('src', API_BASE + src);
      }
      var srcset = el.getAttribute('srcset');
      if (srcset && /(^|,\s*)\/(api|uploads|share)/.test(srcset)) {
        var fixed = srcset.split(',').map(function (part) {
          var trimmed = part.trim();
          if (BACKEND_PREFIX_RE.test(trimmed)) return API_BASE + trimmed;
          return part;
        }).join(',');
        el.setAttribute('srcset', fixed);
      }
    }
  }

  function fixSubtree(root) {
    if (!root) return;
    if (root.nodeType === 1) fixElementUrls(root);
    var nodes = root.querySelectorAll ? root.querySelectorAll('img, source, video, audio') : [];
    for (var i = 0; i < nodes.length; i++) fixElementUrls(nodes[i]);
  }

  function attachObserver() {
    try {
      fixSubtree(document.body);
      var mo = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (m.type === 'childList') {
            for (var j = 0; j < m.addedNodes.length; j++) fixSubtree(m.addedNodes[j]);
          } else if (m.type === 'attributes' && (m.attributeName === 'src' || m.attributeName === 'srcset')) {
            fixElementUrls(m.target);
          }
        }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset'] });
    } catch (e) { /* ignore */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachObserver, { once: true });
  } else {
    attachObserver();
  }

  // ---- 6. Hide native splash as soon as the page is fully loaded ----
  // Capacitor.config also has launchAutoHide=true with a 3s fallback;
  // this gives a snappier hide when content is ready earlier than that.
  function hideSplashWhenReady() {
    try {
      var SplashScreen = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen;
      if (!SplashScreen || typeof SplashScreen.hide !== 'function') return;
      var done = false;
      var doHide = function () {
        if (done) return;
        done = true;
        SplashScreen.hide({ fadeOutDuration: 250 }).catch(function () {});
      };
      if (document.readyState === 'complete') {
        setTimeout(doHide, 80);
      } else {
        window.addEventListener('load', function () { setTimeout(doHide, 80); }, { once: true });
      }
      // Hard cap so we never linger if 'load' is delayed by a slow image
      setTimeout(doHide, 4000);
    } catch (e) { /* ignore */ }
  }
  hideSplashWhenReady();

  // Debug breadcrumb
  try { console.log('[BodyBank App] API base =', API_BASE); } catch (e) {}
})();
