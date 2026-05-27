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
const SMOKE_SRC = path.join(SRC_WEB, '__smoke.html');

const INJECT_TAG = '<script src="/js/bb-app-config.js"></script>';
const INJECT_MARKER = 'bb-app-config.js'; // detect prior injection

function log(msg) { console.log('[build-www] ' + msg); }

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
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
  if (content.includes(INJECT_MARKER)) return false; // already present
  const headRe = /<head\b[^>]*>/i;
  if (!headRe.test(content)) return false;
  content = content.replace(headRe, m => m + '\n' + INJECT_TAG);
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

log('Source: ' + SOURCE_PUBLIC);
log('Dest:   ' + DEST_WWW);

rmrf(DEST_WWW);
copyDir(SOURCE_PUBLIC, DEST_WWW);
log('Mirrored public/ -> www/');

// Drop our config script into www/js/
fs.mkdirSync(path.join(DEST_WWW, 'js'), { recursive: true });
fs.copyFileSync(CONFIG_SRC, path.join(DEST_WWW, 'js', 'bb-app-config.js'));
log('Copied bb-app-config.js into www/js/');

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
log('Done.');
