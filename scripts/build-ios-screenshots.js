#!/usr/bin/env node
/*
 * Builds App Store (iPhone 6.9") screenshots at 1320 x 2868.
 *
 * Source: store-assets/screenshots-play-2026-08/source-captures/*.png
 *         (1170x2532 captures of the REAL app, taken from the live member
 *         shell against a seeded demo account — same captures the Play
 *         listing uses, so nothing here is a mockup.)
 *
 * Output: store-assets/screenshots-ios-2026-09/*.png
 *
 * Style matches the Play panels: gold-tinted radial ground, BODYBANK
 * wordmark, eyebrow, two-line headline (white + gold), subline, then the
 * capture inside a gold-edged phone bezel. The display area keeps the
 * capture's native 1170:2532 aspect so nothing is cropped or stretched.
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'store-assets', 'screenshots-play-2026-08', 'source-captures');
const DST = path.join(ROOT, 'store-assets', 'screenshots-ios-2026-09');

const W = 1320, H = 2868;

const PHONE_W = 1048;
const BEZEL = 24;
const DISPLAY_W = PHONE_W - 2 * BEZEL;                        // 1000
const DISPLAY_H = Math.round(DISPLAY_W * (2532 / 1170));      // 2164 — native aspect
const PHONE_H = DISPLAY_H + 2 * BEZEL;                        // 2212
const PHONE_X = Math.round((W - PHONE_W) / 2);                // 136
const PHONE_Y = 620;
const DISPLAY_X = PHONE_X + BEZEL;
const DISPLAY_Y = PHONE_Y + BEZEL;
const PHONE_RADIUS = 76;
const DISPLAY_RADIUS = 56;

const GOLD = '#c8a44e';
const FONT = "Poppins, Montserrat, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

// Order matters: the App Store shows only the first 1-3 in search results.
const SCREENS = [
  { src: '01-home.png', eyebrow: 'YOUR DAY',
    line1: 'Your whole day,', line2: 'on one screen.',
    sub: 'Streak, targets and what is still left — the moment you open the app.' },
  { src: '04-food-macros.png', eyebrow: 'NUTRITION',
    line1: 'Snap the plate.', line2: 'Macros in seconds.',
    sub: 'Photograph a meal and get calories and macros back automatically.' },
  { src: '05-messages.png', eyebrow: 'COACHING',
    line1: 'Your coach,', line2: 'in one thread.',
    sub: 'A real Lifestyle Manager — not a chatbot, not a forum.' },
  { src: '02-home-day.png', eyebrow: 'DAILY TARGETS',
    line1: 'Today, measured', line2: 'against your goals.',
    sub: 'Steps, water, protein and sleep — tracked against what you set out to do.' },
  { src: '07-weekly.png', eyebrow: 'WEEKLY REVIEW',
    line1: 'The week,', line2: 'scored.',
    sub: 'Every target reviewed, so progress is a number and not a feeling.' },
  { src: '06-checkin.png', eyebrow: 'CHECK-IN',
    line1: 'Four numbers.', line2: 'Ten seconds.',
    sub: 'A check-in short enough that you actually keep doing it.' },
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function backgroundSvg(s) {
  return Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <radialGradient id="bg" cx="50%" cy="30%" r="80%">
        <stop offset="0%"   stop-color="#2a2210"/>
        <stop offset="42%"  stop-color="#120c06"/>
        <stop offset="100%" stop-color="#050505"/>
      </radialGradient>
      <linearGradient id="bezel" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stop-color="#1f1c14"/>
        <stop offset="100%" stop-color="#0c0a05"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>

    <text x="${W / 2}" y="120" text-anchor="middle" font-family="${FONT}"
          font-size="52" font-weight="700" letter-spacing="11" fill="${GOLD}">BODYBANK</text>

    <text x="${W / 2}" y="205" text-anchor="middle" font-family="${FONT}"
          font-size="27" font-weight="600" letter-spacing="9" fill="#8b8b8b">${esc(s.eyebrow)}</text>

    <text x="${W / 2}" y="315" text-anchor="middle" font-family="${FONT}"
          font-size="82" font-weight="700" fill="#f4f1ea">${esc(s.line1)}</text>
    <text x="${W / 2}" y="410" text-anchor="middle" font-family="${FONT}"
          font-size="82" font-weight="700" fill="${GOLD}">${esc(s.line2)}</text>

    <text x="${W / 2}" y="490" text-anchor="middle" font-family="${FONT}"
          font-size="30" font-weight="400" fill="#9a9a9a">${esc(s.sub)}</text>

    <rect x="${PHONE_X}" y="${PHONE_Y}" width="${PHONE_W}" height="${PHONE_H}"
          rx="${PHONE_RADIUS}" ry="${PHONE_RADIUS}"
          fill="url(#bezel)" stroke="${GOLD}" stroke-width="2" opacity="0.95"/>
    <rect x="${PHONE_X + 3}" y="${PHONE_Y + 3}" width="${PHONE_W - 6}" height="4"
          rx="2" ry="2" fill="${GOLD}" opacity="0.18"/>
  </svg>`);
}

const roundMaskSvg = () => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${DISPLAY_W}" height="${DISPLAY_H}">` +
  `<rect width="${DISPLAY_W}" height="${DISPLAY_H}" rx="${DISPLAY_RADIUS}" ry="${DISPLAY_RADIUS}" fill="#fff"/></svg>`);

(async () => {
  if (!fs.existsSync(SRC)) { console.error('No source folder:', SRC); process.exit(1); }
  fs.mkdirSync(DST, { recursive: true });
  console.log(`[ios-screenshots] ${W}x${H} -> ${DST}`);
  let i = 0;
  for (const s of SCREENS) {
    const srcPath = path.join(SRC, s.src);
    if (!fs.existsSync(srcPath)) { console.warn('  SKIP missing', s.src); continue; }
    i += 1;
    const shot = await sharp(srcPath)
      .resize(DISPLAY_W, DISPLAY_H, { fit: 'cover' })
      .composite([{ input: roundMaskSvg(), blend: 'dest-in' }])
      .png().toBuffer();
    const out = String(i).padStart(2, '0') + '-' + s.src.replace(/^\d+-/, '');
    await sharp(backgroundSvg(s))
      .composite([{ input: shot, left: DISPLAY_X, top: DISPLAY_Y }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(DST, out));
    console.log('  wrote', out);
  }
  console.log('[ios-screenshots] Done.');
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
