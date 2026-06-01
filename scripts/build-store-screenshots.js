#!/usr/bin/env node
/*
 * Builds Play Store screenshots in PHONE-FRAME style:
 *   - gold-tinted radial background
 *   - 2-line gold gradient headline at top
 *   - app screenshot inside a phone-shaped bezel (rounded rect + gold border)
 *
 * Input:  store-assets/screenshots-final/*.png   (1080x1920 plain captures)
 * Output: store-assets/screenshots-store/*.png    (1080x1920 marketing shots)
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'store-assets', 'screenshots-final');
const DST = path.join(ROOT, 'store-assets', 'screenshots-store');

const W = 1080, H = 1920;

// Phone frame geometry (centered). Bezel is 20px around the screen so the
// display area keeps the screenshot's native 9:16 aspect.
const PHONE_W = 720;
const BEZEL = 20;
const DISPLAY_W = PHONE_W - 2 * BEZEL;                          // 680
const DISPLAY_H = Math.round(DISPLAY_W * (H / W));              // 1209 (matches 9:16)
const PHONE_H = DISPLAY_H + 2 * BEZEL;                          // 1249
const PHONE_X = Math.round((W - PHONE_W) / 2);                  // 180
const PHONE_Y = 325;
const DISPLAY_X = PHONE_X + BEZEL;                              // 200
const DISPLAY_Y = PHONE_Y + BEZEL;                              // 345
const PHONE_RADIUS = 58;
const DISPLAY_RADIUS = 40;

const GOLD = '#c8a44e';
const GOLD2 = '#d0b058';

const SCREENS = [
  { src: '01-dashboard.png',            line1: 'YOUR TRANSFORMATION', line2: 'TRACKED' },
  { src: '02-muscle-ranking-front.png', line1: 'SEE EVERY MUSCLE',    line2: 'RANKED' },
  { src: '03-muscle-ranking-score.png', line1: 'KNOW YOUR',           line2: 'BODY AUDIT SCORE' },
  { src: '04-muscle-ranking-back.png',  line1: 'STRONGEST & WEAKEST', line2: 'MAPPED' },
  { src: '05-nutrition.png',            line1: 'LOG EVERY MEAL',      line2: 'EFFORTLESSLY' },
  { src: '06-workout-logging.png',      line1: 'TRACK EVERY',         line2: 'SESSION' },
  { src: '07-coaching-messages.png',    line1: 'YOUR COACH',          line2: 'IN YOUR POCKET' },
  { src: '08-features-menu.png',        line1: 'EVERYTHING',          line2: 'IN ONE PLACE' },
];

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function backgroundSvg(rawLine1, rawLine2) {
  const line1 = esc(rawLine1);
  const line2 = esc(rawLine2);
  return Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <radialGradient id="bg" cx="50%" cy="48%" r="72%">
        <stop offset="0%"   stop-color="#2a2210"/>
        <stop offset="40%"  stop-color="#120c06"/>
        <stop offset="100%" stop-color="#050505"/>
      </radialGradient>
      <linearGradient id="goldtext" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stop-color="#e6cf80"/>
        <stop offset="50%"  stop-color="${GOLD}"/>
        <stop offset="100%" stop-color="${GOLD2}"/>
      </linearGradient>
      <linearGradient id="bezel" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stop-color="#1f1c14"/>
        <stop offset="100%" stop-color="#0c0a05"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <text x="${W / 2}" y="172" text-anchor="middle"
          font-family="Impact, 'Arial Black', sans-serif" font-size="64" font-weight="900"
          letter-spacing="1.5" fill="url(#goldtext)">${line1}</text>
    <text x="${W / 2}" y="248" text-anchor="middle"
          font-family="Impact, 'Arial Black', sans-serif" font-size="64" font-weight="900"
          letter-spacing="1.5" fill="url(#goldtext)">${line2}</text>
    <!-- phone bezel/frame -->
    <rect x="${PHONE_X}" y="${PHONE_Y}" width="${PHONE_W}" height="${PHONE_H}"
          rx="${PHONE_RADIUS}" ry="${PHONE_RADIUS}"
          fill="url(#bezel)" stroke="${GOLD}" stroke-width="2" opacity="0.95"/>
    <!-- subtle inner highlight along the bezel top to give depth -->
    <rect x="${PHONE_X + 2}" y="${PHONE_Y + 2}" width="${PHONE_W - 4}" height="3"
          rx="2" ry="2" fill="${GOLD}" opacity="0.18"/>
  </svg>`);
}

function roundMaskSvg() {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${DISPLAY_W}" height="${DISPLAY_H}"><rect x="0" y="0" width="${DISPLAY_W}" height="${DISPLAY_H}" rx="${DISPLAY_RADIUS}" ry="${DISPLAY_RADIUS}" fill="#fff"/></svg>`);
}

async function buildOne(s) {
  const srcPath = path.join(SRC, s.src);
  if (!fs.existsSync(srcPath)) { console.warn('  SKIP missing', s.src); return; }

  const roundedShot = await sharp(srcPath)
    .resize(DISPLAY_W, DISPLAY_H, { fit: 'cover' })
    .composite([{ input: roundMaskSvg(), blend: 'dest-in' }])
    .png()
    .toBuffer();

  await sharp(backgroundSvg(s.line1, s.line2))
    .composite([{ input: roundedShot, left: DISPLAY_X, top: DISPLAY_Y }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(DST, s.src));
  console.log('  wrote', s.src);
}

(async () => {
  if (!fs.existsSync(SRC)) { console.error('No source folder:', SRC); process.exit(1); }
  fs.mkdirSync(DST, { recursive: true });
  console.log('[build-store-screenshots] PHONE-FRAME style');
  console.log('[build-store-screenshots] Output:', DST);
  for (const s of SCREENS) await buildOne(s);
  console.log('[build-store-screenshots] Done.');
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
