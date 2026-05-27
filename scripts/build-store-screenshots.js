#!/usr/bin/env node
/*
 * Builds enhanced Play Store screenshots: gold headline on a dark branded
 * background + the app screenshot in a rounded gold-edged frame.
 *
 * Input:  store-assets/screenshots-final/*.png  (1080x1920 plain captures)
 * Output: store-assets/screenshots-store/*.png   (1080x1920 marketing shots)
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'store-assets', 'screenshots-final');
const DST = path.join(ROOT, 'store-assets', 'screenshots-store');

const W = 1080, H = 1920;
const SHOT_W = 856;
const SHOT_H = Math.round(SHOT_W * H / W); // preserves 9:16 -> 1522
const SHOT_X = Math.round((W - SHOT_W) / 2);
const SHOT_Y = 372;
const RADIUS = 38;

const GOLD = '#d0b058';
const GOLD2 = '#c8a44e';

const SCREENS = [
  { src: '01-dashboard.png',            line1: 'YOUR TRANSFORMATION', line2: 'TRACKED' },
  { src: '02-muscle-ranking-front.png', line1: 'SEE EVERY MUSCLE',    line2: 'RANKED' },
  { src: '03-muscle-ranking-score.png', line1: 'KNOW YOUR',           line2: 'BODY AUDIT SCORE' },
  { src: '04-muscle-ranking-back.png',  line1: 'STRONGEST & WEAKEST', line2: 'MAPPED' },
  { src: '05-nutrition.png',            line1: 'LOG EVERY MEAL',       line2: 'EFFORTLESSLY' },
  { src: '06-workout-logging.png',      line1: 'TRACK EVERY',          line2: 'SESSION' },
  { src: '07-coaching-messages.png',    line1: 'YOUR COACH',           line2: 'IN YOUR POCKET' },
  { src: '08-features-menu.png',        line1: 'EVERYTHING',           line2: 'IN ONE PLACE' },
];

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function backgroundSvg(rawLine1, rawLine2) {
  const line1 = esc(rawLine1);
  const line2 = esc(rawLine2);
  return Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <radialGradient id="bg" cx="50%" cy="15%" r="85%">
        <stop offset="0%" stop-color="#1c1810"/>
        <stop offset="45%" stop-color="#0d0b07"/>
        <stop offset="100%" stop-color="#050505"/>
      </radialGradient>
      <linearGradient id="goldtext" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#e6cf80"/>
        <stop offset="50%" stop-color="${GOLD}"/>
        <stop offset="100%" stop-color="${GOLD2}"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <text x="${W / 2}" y="168" text-anchor="middle"
          font-family="Impact, 'Arial Black', sans-serif" font-size="62" font-weight="900"
          letter-spacing="1.5" fill="url(#goldtext)">${line1}</text>
    <text x="${W / 2}" y="246" text-anchor="middle"
          font-family="Impact, 'Arial Black', sans-serif" font-size="62" font-weight="900"
          letter-spacing="1.5" fill="url(#goldtext)">${line2}</text>
    <rect x="${SHOT_X - 5}" y="${SHOT_Y - 5}" width="${SHOT_W + 10}" height="${SHOT_H + 10}"
          rx="${RADIUS + 5}" ry="${RADIUS + 5}"
          fill="none" stroke="${GOLD2}" stroke-width="3" opacity="0.55"/>
  </svg>`);
}

function roundMask() {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SHOT_W}" height="${SHOT_H}"><rect x="0" y="0" width="${SHOT_W}" height="${SHOT_H}" rx="${RADIUS}" ry="${RADIUS}" fill="#fff"/></svg>`);
}

async function buildOne(s) {
  const srcPath = path.join(SRC, s.src);
  if (!fs.existsSync(srcPath)) { console.warn('  SKIP missing', s.src); return; }

  const roundedShot = await sharp(srcPath)
    .resize(SHOT_W, SHOT_H, { fit: 'cover' })
    .composite([{ input: roundMask(), blend: 'dest-in' }])
    .png()
    .toBuffer();

  await sharp(backgroundSvg(s.line1, s.line2))
    .composite([{ input: roundedShot, left: SHOT_X, top: SHOT_Y }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(DST, s.src));
  console.log('  wrote', s.src);
}

(async () => {
  if (!fs.existsSync(SRC)) { console.error('No source folder:', SRC); process.exit(1); }
  fs.mkdirSync(DST, { recursive: true });
  console.log('[build-store-screenshots] Output:', DST);
  for (const s of SCREENS) await buildOne(s);
  console.log('[build-store-screenshots] Done.');
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
