#!/usr/bin/env node
/*
 * Crops emulator screenshots from 1080x2400 -> 1080x1920 (Play Store's
 * preferred 9:16 ratio) and renames them into upload order.
 *
 * Drops 2 of the 10 captures that are weaker or redundant.
 * Source remains untouched; output goes to store-assets/screenshots-final/.
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'store-assets', 'screenshots');
const DST = path.join(ROOT, 'store-assets', 'screenshots-final');

const TARGET_W = 1080;
const TARGET_H = 1920;

// Final upload order: hero first, then differentiator features, then breadth.
const SELECTION = [
  { src: 'Screenshot_1779431551.png', name: '01-dashboard.png',              caption: 'Dashboard / weekly score' },
  { src: 'Screenshot_1779431715.png', name: '02-muscle-ranking-front.png',   caption: 'Muscle Ranking: front view' },
  { src: 'Screenshot_1779431708.png', name: '03-muscle-ranking-score.png',   caption: 'Muscle Ranking: 91/100 + workouts' },
  { src: 'Screenshot_1779431719.png', name: '04-muscle-ranking-back.png',    caption: 'Muscle Ranking: back view' },
  { src: 'Screenshot_1779431687.png', name: '05-nutrition.png',              caption: 'Nutrition: 4-meal photo upload' },
  { src: 'Screenshot_1779431575.png', name: '06-workout-logging.png',        caption: 'Workout logging' },
  { src: 'Screenshot_1779431695.png', name: '07-coaching-messages.png',      caption: 'Lifestyle Manager chat' },
  { src: 'Screenshot_1779431569.png', name: '08-features-menu.png',          caption: 'Feature menu / breadth' },
];

async function processOne({ src, name }) {
  const srcPath = path.join(SRC, src);
  if (!fs.existsSync(srcPath)) {
    console.warn('  SKIP missing:', src);
    return;
  }
  const meta = await sharp(srcPath).metadata();

  // Compute crop: keep top of frame (status bar + app header + content),
  // drop bottom (system nav bar). If source is exactly the expected
  // 1080x2400, this just removes the bottom 480px.
  const aspectTarget = TARGET_W / TARGET_H;
  let cropW, cropH, cropLeft, cropTop;
  if (meta.width / meta.height > aspectTarget) {
    // wider than target: crop sides
    cropH = meta.height;
    cropW = Math.round(meta.height * aspectTarget);
    cropTop = 0;
    cropLeft = Math.round((meta.width - cropW) / 2);
  } else {
    // taller than target: keep top of frame
    cropW = meta.width;
    cropH = Math.round(meta.width / aspectTarget);
    cropTop = 0;
    cropLeft = 0;
  }

  await sharp(srcPath)
    .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
    .resize(TARGET_W, TARGET_H, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(DST, name));

  console.log(`  wrote ${name}  (src ${meta.width}x${meta.height} -> ${TARGET_W}x${TARGET_H})`);
}

(async () => {
  if (!fs.existsSync(SRC)) {
    console.error('[process-screenshots] No source folder:', SRC);
    process.exit(1);
  }
  fs.mkdirSync(DST, { recursive: true });
  console.log('[process-screenshots] Output:', DST);
  for (const item of SELECTION) {
    await processOne(item);
  }
  console.log('[process-screenshots] Done.');
})().catch(err => {
  console.error('[process-screenshots] FAILED:', err);
  process.exit(1);
});
