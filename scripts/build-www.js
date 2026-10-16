#!/usr/bin/env node
/*
 * Mirrors ../bodybank/public/  ->  ./www/
 * then injects the BodyBank app-config script tag into every HTML page.
 *
 * This script is the ONLY thing that writes into www/. The web app's
 * public/ folder is treated as read-only source of truth.
 *
 * Idempotent: safe to run repeatedly. Wipes www/ each run so deletions
 * upstream are reflected.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_PUBLIC = path.resolve(ROOT, '..', 'bodybank', 'public');
const DEST_WWW = path.resolve(ROOT, 'www');
const SRC_WEB = path.resolve(ROOT, 'src-web');

const CONFIG_SRC = path.join(SRC_WEB, 'bb-app-config.js');
// Store update alert (app builds only; a no-op on the web). Loads right after the config.
const UPDATE_SRC = path.join(SRC_WEB, 'bb-app-update.js');
const SMOKE_SRC = path.join(SRC_WEB, '__smoke.html');

const INJECT_TAG = '<script src="/js/bb-app-config.js"></script>';
const UPDATE_TAG = '<script src="/js/bb-app-update.js" defer></script>';
// Detect a prior injection by the TAG itself, not the bare file name: a page that
// merely mentions "bb-app-config.js" in a comment used to be skipped, shipping
// an app shell with no config (API calls to localhost). Caught 2026-09-30.
// Each tag is checked on its own, so a page that already has the config tag
// still gets the update tag placed right after it.
const INJECT_MARKER = INJECT_TAG;
const UPDATE_MARKER = UPDATE_TAG;

function log(msg) { console.log('[build-www] ' + msg); }

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

// Top-level directories under public/ that should NOT be bundled into www/.
// These are served from the live web instead (see bb-app-config.js URL rewrite),
// or are runtime-generated user data that must never ship inside the app bundle.
// reports/ = generated user weekly-report PDFs (privacy).
// pricing.html = website-only plan prices + purchase CTAs. Apple 3.1.1 / Google Play
// Payments: the apps must not show prices or point to an outside purchase, so the
// page never ships in the bundle (its links are also hidden in-app via .bb-web-only).
const SKIP_TOP_LEVEL = new Set(['videos', 'reports', 'pricing.html']);

function copyDir(src, dst, skipTopLevel) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skipTopLevel && skipTopLevel.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function walk(dir, predicate, out) {
  out = out || [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, out);
    else if (predicate(full)) out.push(full);
  }
  return out;
}

function injectIntoHtml(file) {
  let content = fs.readFileSync(file, 'utf8');
  const hasConfig = content.includes(INJECT_MARKER);
  const hasUpdate = content.includes(UPDATE_MARKER);
  if (hasConfig && hasUpdate) return false; // already present
  if (hasConfig) {
    content = content.replace(INJECT_TAG, INJECT_TAG + '\n' + UPDATE_TAG);
  } else {
    const headRe = /<head\b[^>]*>/i;
    if (!headRe.test(content)) return false;
    content = content.replace(headRe, m => m + '\n' + INJECT_TAG + (hasUpdate ? '' : '\n' + UPDATE_TAG));
  }
  fs.writeFileSync(file, content, 'utf8');
  return true;
}

// ---- main ----
if (!fs.existsSync(SOURCE_PUBLIC)) {
  console.error('[build-www] ERROR: source not found: ' + SOURCE_PUBLIC);
  process.exit(1);
}
if (!fs.existsSync(CONFIG_SRC)) {
  console.error('[build-www] ERROR: bb-app-config.js not found at ' + CONFIG_SRC);
  process.exit(1);
}
if (!fs.existsSync(UPDATE_SRC)) {
  console.error('[build-www] ERROR: bb-app-update.js not found at ' + UPDATE_SRC);
  process.exit(1);
}

log('Source: ' + SOURCE_PUBLIC);
log('Dest:   ' + DEST_WWW);

rmrf(DEST_WWW);
copyDir(SOURCE_PUBLIC, DEST_WWW, SKIP_TOP_LEVEL);
log('Mirrored public/ -> www/  (skipped: ' + Array.from(SKIP_TOP_LEVEL).join(', ') + ')');

// Drop our config script into www/js/
fs.mkdirSync(path.join(DEST_WWW, 'js'), { recursive: true });
fs.copyFileSync(CONFIG_SRC, path.join(DEST_WWW, 'js', 'bb-app-config.js'));
log('Copied bb-app-config.js into www/js/');
fs.copyFileSync(UPDATE_SRC, path.join(DEST_WWW, 'js', 'bb-app-update.js'));
log('Copied bb-app-update.js into www/js/');

// Smoke page (optional)
if (fs.existsSync(SMOKE_SRC)) {
  fs.copyFileSync(SMOKE_SRC, path.join(DEST_WWW, '__smoke.html'));
  log('Copied __smoke.html');
}

// Inject the script tag into every HTML in www/
const htmlFiles = walk(DEST_WWW, f => f.toLowerCase().endsWith('.html'));
let injected = 0;
for (const f of htmlFiles) {
  if (injectIntoHtml(f)) injected++;
}
log(`Injected config script into ${injected} / ${htmlFiles.length} HTML files`);
// Every page with a <head> must carry both tags, config first. A miss ships an app
// page with no API base or no update check, so fail the build instead.
const missing = htmlFiles.filter(f => {
  const c = fs.readFileSync(f, 'utf8');
  if (!/<head\b[^>]*>/i.test(c)) return false;
  const a = c.indexOf(INJECT_TAG);
  const b = c.indexOf(UPDATE_TAG);
  return a < 0 || b < 0 || b < a;
});
if (missing.length) {
  console.error('[build-www] ERROR: app script tags missing or out of order in: ' + missing.map(f => path.relative(DEST_WWW, f)).join(', '));
  process.exit(1);
}
log('Done.');
