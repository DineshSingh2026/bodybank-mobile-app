#!/usr/bin/env node
/*
 * Builds App Store screenshots for every iPhone size App Store Connect asks for.
 *
 * Source: store-assets/screenshots-play-2026-08/source-captures/*.png
 *         (1170x2532 captures of the REAL app, from the live member shell
 *         against a seeded demo account - the same captures the Play listing
 *         uses. No mockups, no real member data.)
 *
 * Output: store-assets/screenshots-ios-2026-09/<size-label>/*.png
 *
 * SIZES - App Store Connect validates these exactly and rejects anything else:
 *   iphone-6.9  1320 x 2868   (the 6.9-inch Display tab)
 *   iphone-6.5  1284 x 2778   (the 6.5-inch Display tab; 1242x2688 also legal)
 *
 * Every size shares one proportional layout, so the set looks identical
 * whichever tab it lands in. The display area always keeps the capture's
 * native 1170:2532 aspect, so nothing is stretched or cropped.
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'store-assets', 'screenshots-play-2026-08', 'source-captures');
const DST = path.join(ROOT, 'store-assets', 'screenshots-ios-2026-09');

const SIZES = [
  { label: 'iphone-6.9', w: 1320, h: 2868 },
  { label: 'iphone-6.5', w: 1284, h: 2778 },
];

const SRC_W = 1170, SRC_H = 2532;
const GOLD = '#c8a44e';
const FONT = "Poppins, Montserrat, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

// Order matters: the App Store shows only the first 1-3 in search results.
const SCREENS = [
  { src: '01-home.png', eyebrow: 'YOUR DAY',
    line1: 'Your whole day,', line2: 'on one screen.',
    sub: 'Streak, targets and what is still left the moment you open the app.' },
  { src: '04-food-macros.png', eyebrow: 'NUTRITION',
    line1: 'Snap the plate.', line2: 'Macros in seconds.',
    sub: 'Photograph a meal and get calories and macros back automatically.' },
  { src: '05-messages.png', eyebrow: 'COACHING',
    line1: 'Your coach,', line2: 'in one thread.',
    sub: 'A real Lifestyle Manager, not a chatbot and not a forum.' },
  { src: '02-home-day.png', eyebrow: 'DAILY TARGETS',
    line1: 'Today, measured', line2: 'against your goals.',
    sub: 'Steps, water, protein and sleep, tracked against what you set out to do.' },
  { src: '07-weekly.png', eyebrow: 'WEEKLY REVIEW',
    line1: 'The week,', line2: 'scored.',
    sub: 'Every target reviewed, so progress is a number and not a feeling.' },
  { src: '06-checkin.png', eyebrow: 'CHECK-IN',
    line1: 'Four numbers.', line2: 'Ten seconds.',
    sub: 'A check-in short enough that you actually keep doing it.' },
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Layout expressed as fractions of the canvas, so every size matches.
function layout(W, H) {
  const r = n => Math.round(n);
  const PHONE_W = r(W * 0.7939);
  const BEZEL = r(W * 0.0182);
  const DISPLAY_W = PHONE_W - 2 * BEZEL;
  const DISPLAY_H = r(DISPLAY_W * (SRC_H / SRC_W));
  const PHONE_H = DISPLAY_H + 2 * BEZEL;
  // Sit the phone just below the copy, and never let it run off the canvas.
  const PHONE_Y = Math.min(r(H * 0.2162), H - PHONE_H - r(H * 0.009));
  const PHONE_X = r((W - PHONE_W) / 2);
  return {
    PHONE_W, PHONE_H, PHONE_X, PHONE_Y, BEZEL, DISPLAY_W, DISPLAY_H,
    DISPLAY_X: PHONE_X + BEZEL, DISPLAY_Y: PHONE_Y + BEZEL,
    PHONE_RADIUS: r(W * 0.0576), DISPLAY_RADIUS: r(W * 0.0424),
    WORD_Y: r(H * 0.0418), WORD_SZ: r(W * 0.0394),
    EYE_Y: r(H * 0.0715), EYE_SZ: r(W * 0.0205),
    L1_Y: r(H * 0.1098), L2_Y: r(H * 0.1430), LINE_SZ: r(W * 0.0621),
    SUB_Y: r(H * 0.1709), SUB_SZ: r(W * 0.0227),
  };
}

function backgroundSvg(s, W, H, L) {
  const wordSpace = Math.round(W * 0.0083);
  const eyeSpace = Math.round(W * 0.0068);
  return Buffer.from([
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">',
    '  <defs>',
    '    <radialGradient id="bg" cx="50%" cy="30%" r="80%">',
    '      <stop offset="0%" stop-color="#2a2210"/>',
    '      <stop offset="42%" stop-color="#120c06"/>',
    '      <stop offset="100%" stop-color="#050505"/>',
    '    </radialGradient>',
    '    <linearGradient id="bezel" x1="0%" y1="0%" x2="0%" y2="100%">',
    '      <stop offset="0%" stop-color="#1f1c14"/>',
    '      <stop offset="100%" stop-color="#0c0a05"/>',
    '    </linearGradient>',
    '  </defs>',
    '  <rect width="' + W + '" height="' + H + '" fill="url(#bg)"/>',
    '  <text x="' + (W / 2) + '" y="' + L.WORD_Y + '" text-anchor="middle"',
    '        font-family="' + FONT + '" font-size="' + L.WORD_SZ + '" font-weight="700"',
    '        letter-spacing="' + wordSpace + '" fill="' + GOLD + '">BODYBANK</text>',
    '  <text x="' + (W / 2) + '" y="' + L.EYE_Y + '" text-anchor="middle"',
    '        font-family="' + FONT + '" font-size="' + L.EYE_SZ + '" font-weight="600"',
    '        letter-spacing="' + eyeSpace + '" fill="#8b8b8b">' + esc(s.eyebrow) + '</text>',
    '  <text x="' + (W / 2) + '" y="' + L.L1_Y + '" text-anchor="middle"',
    '        font-family="' + FONT + '" font-size="' + L.LINE_SZ + '" font-weight="700"',
    '        fill="#f4f1ea">' + esc(s.line1) + '</text>',
    '  <text x="' + (W / 2) + '" y="' + L.L2_Y + '" text-anchor="middle"',
    '        font-family="' + FONT + '" font-size="' + L.LINE_SZ + '" font-weight="700"',
    '        fill="' + GOLD + '">' + esc(s.line2) + '</text>',
    '  <text x="' + (W / 2) + '" y="' + L.SUB_Y + '" text-anchor="middle"',
    '        font-family="' + FONT + '" font-size="' + L.SUB_SZ + '" font-weight="400"',
    '        fill="#9a9a9a">' + esc(s.sub) + '</text>',
    '  <rect x="' + L.PHONE_X + '" y="' + L.PHONE_Y + '" width="' + L.PHONE_W + '" height="' + L.PHONE_H + '"',
    '        rx="' + L.PHONE_RADIUS + '" ry="' + L.PHONE_RADIUS + '"',
    '        fill="url(#bezel)" stroke="' + GOLD + '" stroke-width="2" opacity="0.95"/>',
    '  <rect x="' + (L.PHONE_X + 3) + '" y="' + (L.PHONE_Y + 3) + '" width="' + (L.PHONE_W - 6) + '" height="4"',
    '        rx="2" ry="2" fill="' + GOLD + '" opacity="0.18"/>',
    '</svg>',
  ].join('\n'));
}

const roundMaskSvg = L => Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="' + L.DISPLAY_W + '" height="' + L.DISPLAY_H + '">' +
  '<rect width="' + L.DISPLAY_W + '" height="' + L.DISPLAY_H + '" rx="' + L.DISPLAY_RADIUS +
  '" ry="' + L.DISPLAY_RADIUS + '" fill="#fff"/></svg>');

(async () => {
  if (!fs.existsSync(SRC)) { console.error('No source folder:', SRC); process.exit(1); }
  for (const size of SIZES) {
    const W = size.w, H = size.h;
    const L = layout(W, H);
    const outDir = path.join(DST, size.label);
    fs.mkdirSync(outDir, { recursive: true });
    console.log('[ios-screenshots] ' + size.label + '  ' + W + 'x' + H);
    let i = 0;
    for (const s of SCREENS) {
      const srcPath = path.join(SRC, s.src);
      if (!fs.existsSync(srcPath)) { console.warn('  SKIP missing', s.src); continue; }
      i += 1;
      const shot = await sharp(srcPath)
        .resize(L.DISPLAY_W, L.DISPLAY_H, { fit: 'cover' })
        .composite([{ input: roundMaskSvg(L), blend: 'dest-in' }])
        .png().toBuffer();
      const out = String(i).padStart(2, '0') + '-' + s.src.replace(/^\d+-/, '');
      await sharp(backgroundSvg(s, W, H, L))
        .composite([{ input: shot, left: L.DISPLAY_X, top: L.DISPLAY_Y }])
        .png({ compressionLevel: 9 })
        .toFile(path.join(outDir, out));
      console.log('  wrote ' + size.label + '/' + out);
    }
  }
  console.log('[ios-screenshots] Done.');
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
