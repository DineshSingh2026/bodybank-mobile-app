#!/usr/bin/env node
/*
 * iOS ONLY. Removes third-party platform references (Google Play, Android-only
 * features) and leftovers of removed features from the web payload that ships
 * inside the iOS binary.
 *
 * Why: App Review rejected build 1.0 (9) under Guideline 2.3.10 — "Revise the app's
 * binary to remove Google Play references." The payload is mirrored from the website,
 * where the "Get it on Google Play" badges belong, so the source stays untouched.
 *
 * How: runs AFTER `npx cap sync ios` / `npx cap copy ios`, against ios/App/App/public
 * (the copy Xcode bundles). www/ and the Android assets are never touched, so Android
 * is unaffected. It finishes with a scan and exits 1 if anything survives, so a future
 * website change fails the iOS build loudly instead of failing App Review.
 *
 *   node scripts/ios-strip-store-refs.js [targetDir]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.resolve(process.argv[2] || path.join(ROOT, 'ios', 'App', 'App', 'public'));

// Anything matching this anywhere in the bundle fails the build.
const FORBIDDEN = /google[\s-]*play|play[\s-]*store|play\.google/i;
// Visible-text leftovers that are wrong inside the iOS app. Checked in .html and .js.
const FORBIDDEN_PAGE = /class="[^"]*\bbb-store-|launching soon|coming to the app store|ios app is launching|elite feed|community feed|health connect|bodybank android app/i;

function log(msg) { console.log('[ios-strip-store-refs] ' + msg); }
function fail(msg) { console.error('[ios-strip-store-refs] ERROR: ' + msg); process.exit(1); }

// Platform-separation guard: never let this run against the shared or Android payload.
const rel = path.relative(ROOT, TARGET).split(path.sep).join('/');
if (rel === 'www' || rel.startsWith('www/') || /(^|\/)android(\/|$)/i.test(rel)) {
  fail('refusing to modify ' + rel + ' — this script is for the iOS copy only');
}
if (!fs.existsSync(TARGET)) fail('target not found: ' + TARGET + ' (run `npx cap sync ios` first)');

// Removes every element whose class list contains `token`, including its children.
// Also swallows the element's own indentation and trailing line break.
function removeElements(html, token) {
  const esc = token.replace(/[-]/g, '\\-');
  const openRe = new RegExp('<([a-z][a-z0-9]*)\\b[^>]*\\bclass="(?:[^"]*\\s)?' + esc + '(?:\\s[^"]*)?"[^>]*>', 'i');
  let count = 0;
  for (;;) {
    const m = openRe.exec(html);
    if (!m) break;
    const tag = m[1];
    let start = m.index;
    let end = m.index + m[0].length;
    const tagRe = new RegExp('<(\\/?)' + tag + '\\b[^>]*>', 'gi');
    tagRe.lastIndex = end;
    let depth = 1, t;
    while (depth > 0 && (t = tagRe.exec(html))) {
      depth += t[1] ? -1 : 1;
      end = t.index + t[0].length;
    }
    if (depth !== 0) fail('unbalanced <' + tag + '> for .' + token);
    const lineStart = html.lastIndexOf('\n', start - 1) + 1;
    if (/^[ \t]*$/.test(html.slice(lineStart, start))) start = lineStart;
    const tail = /^[ \t]*\r?\n/.exec(html.slice(end));
    if (tail) end += tail[0].length;
    html = html.slice(0, start) + html.slice(end);
    count++;
  }
  return { html, count };
}

// Text rewrites: [string | RegExp, replacement]. Missing anchors are fine (the website
// may change); the final scan is what guarantees the result.
const TEXT_RULES = [
  // Google Play
  ['<!-- ================= GET THE APP — live on Google Play ================= -->', '<!-- ================= GET THE APP ================= -->'],
  ['direct users to the real app on Play Store / App Store', 'direct users to the real app'],
  // iOS went live 2026-09-24, so the website now names both stores in these two
  // lines. The old single-store anchors are gone — keep these in step with
  // bodybank/public/index.html or the scan below fails the build.
  ['Now live on the App Store &amp; Google Play</p>', 'The BodyBank App</p>'],
  ['The BodyBank app is live on the App Store and Google Play. ', ''],
  ['and as the BodyBank mobile application on Google Play.', 'and as the BodyBank mobile application for iPhone and iPad.'],
  // Android-only wording
  ['The BodyBank Android app requests permissions only as needed:', 'The BodyBank app requests permissions only as needed:'],
  ['(Google on Android, Apple on iOS)', '(Apple speech recognition on iPhone and iPad)'],
  ['<li>Amazfit</li><li>Health Connect</li>', '<li>Amazfit</li>'],
  // Elite Feed was removed on 2026-09-09; these are its leftovers
  ['<!-- ELITE FEED (all community posts) — matches /dashboard.html Feed Studio layout -->', '<!-- MY BODY -->'],
  ['aria-label="Open Elite Feed" title="Open Elite Feed"', 'aria-label="Open AI Trainer" title="Open AI Trainer"'],
  ['id="bbUserActionFabLabel">Elite Feed</span>', 'id="bbUserActionFabLabel">AI Trainer</span>'],
  [/[ \t]*<li>Messages and posts you choose to share to public or community feeds<\/li>\r?\n/g, ''],
  [', progress reports, community feed</li>', ', progress reports</li>'],
];

// Elements removed outright. Order matters: footers first (they contain the rows).
const REMOVE_CLASSES = ['bb-store-footer', 'bb-store-row', 'hero-store', 'appdl-meta'];

// Files removed from the bundle: the Google Play badge, and the Elite Feed Studio page,
// which nothing links to since the feature was removed.
const REMOVE_FILES = ['img/google-play-icon.svg', 'dashboard.html', 'js/dashboard.js', 'js/feed.js'];

// The device picker's catalogue comes from the server (/api/wearables/devices) and
// includes Android Health Connect. Filter it out inside the iOS app only.
const OVERRIDES_FILE = 'js/bb-ios-overrides.js';
const OVERRIDES_TAG = '<script src="/js/bb-ios-overrides.js"></script>';
const OVERRIDES_JS = `/* iOS build only — written by scripts/ios-strip-store-refs.js. Do not edit.
 * Hides Android-only wearable sources (Health Connect) from the device picker, whose
 * catalogue is served by /api/wearables/devices and shared with the Android app. */
(function () {
  if (typeof window.fetch !== 'function' || typeof Response === 'undefined') return;
  var DEVICES_RE = /\\/api\\/wearables\\/devices(?:[?#]|$)/;
  var ANDROID_ONLY = /android|health[\\s_-]*connect/i;
  function androidOnly(d) {
    return !!d && (ANDROID_ONLY.test(String(d.id || '')) || ANDROID_ONLY.test(String(d.label || '')) || ANDROID_ONLY.test(String(d.shortLabel || '')));
  }
  var baseFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var p = baseFetch.apply(this, arguments);
    if (!DEVICES_RE.test(url)) return p;
    return p.then(function (res) {
      if (!res || !res.ok) return res;
      return res.clone().text().then(function (text) {
        var data;
        try { data = JSON.parse(text); } catch (_) { return res; }
        if (!data || !Array.isArray(data.devices)) return res;
        data.devices = data.devices.filter(function (d) { return !androidOnly(d); });
        if (Array.isArray(data.available)) {
          data.available = data.available.filter(function (id) { return !ANDROID_ONLY.test(String(id)); });
        }
        return new Response(JSON.stringify(data), { status: res.status, statusText: res.statusText, headers: { 'Content-Type': 'application/json' } });
      }).catch(function () { return res; });
    });
  };
})();
`;

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out); else out.push(full);
  }
  return out;
}

// 1. Files.
for (const f of REMOVE_FILES) {
  const full = path.join(TARGET, f);
  if (fs.existsSync(full)) { fs.rmSync(full); log('deleted ' + f); }
}

// 2. HTML pages.
for (const f of walk(TARGET, [])) {
  if (!/\.html?$/i.test(f)) continue;
  const before = fs.readFileSync(f, 'utf8');
  let html = before;
  const notes = [];
  for (const [from, to] of TEXT_RULES) {
    const next = typeof from === 'string' ? html.split(from).join(to) : html.replace(from, to);
    if (next !== html) { html = next; notes.push('text'); }
  }
  for (const cls of REMOVE_CLASSES) {
    const r = removeElements(html, cls);
    html = r.html;
    if (r.count) notes.push(cls + ' x' + r.count);
  }
  if (html !== before) {
    fs.writeFileSync(f, html, 'utf8');
    log('patched ' + path.relative(TARGET, f) + '  (' + notes.join(', ') + ')');
  }
}

// 3. Device-picker filter, loaded straight after bb-app-config.js on the app shell.
fs.writeFileSync(path.join(TARGET, OVERRIDES_FILE), OVERRIDES_JS, 'utf8');
{
  const indexPath = path.join(TARGET, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  if (!html.includes(OVERRIDES_TAG)) {
    const cfg = /<script src="\/js\/bb-app-config\.js"><\/script>/;
    if (!cfg.test(html)) fail('index.html has no bb-app-config.js tag to anchor ' + OVERRIDES_FILE);
    html = html.replace(cfg, (m) => m + '\n' + OVERRIDES_TAG);
    fs.writeFileSync(indexPath, html, 'utf8');
  }
  log('installed ' + OVERRIDES_FILE);
}

// 4. Verify.
const TEXT_EXT = /\.(html?|js|mjs|css|json|svg|txt|xml|webmanifest|map)$/i;
const leftovers = [];
for (const f of walk(TARGET, [])) {
  const r = path.relative(TARGET, f).split(path.sep).join('/');
  if (/google-play/i.test(path.basename(f))) leftovers.push(r + ' (file)');
  if (!TEXT_EXT.test(f)) continue;
  const text = fs.readFileSync(f, 'utf8');
  const isPage = /\.(html?|js)$/i.test(f) && r !== OVERRIDES_FILE;
  if (isPage && /(["'\/])(dashboard\.html|js\/feed\.js|js\/dashboard\.js)\b/.test(text)) {
    leftovers.push(r + '  references a removed Elite Feed file');
  }
  text.split('\n').forEach((line, i) => {
    // Visible-text rules skip code comments; Google Play is banned even there.
    const isComment = /^\s*(\/\/|\/\*|\*|<!--)/.test(line);
    if (FORBIDDEN.test(line) || (isPage && !isComment && FORBIDDEN_PAGE.test(line))) {
      leftovers.push(r + ':' + (i + 1) + '  ' + line.trim().slice(0, 140));
    }
  });
}
if (!fs.readFileSync(path.join(TARGET, 'index.html'), 'utf8').includes(OVERRIDES_TAG)) {
  leftovers.push('index.html  missing ' + OVERRIDES_TAG);
}
if (leftovers.length) {
  fail('references that must not ship in the iOS bundle remain:\n  ' + leftovers.join('\n  '));
}
log('OK — bundle clean: ' + rel);
