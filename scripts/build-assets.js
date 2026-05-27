#!/usr/bin/env node
/*
 * Builds the source images that @capacitor/assets needs:
 *   assets/icon.png             — 1024x1024, logo on solid black (legacy launcher icon)
 *   assets/icon-foreground.png  — 1024x1024, logo on TRANSPARENT (adaptive icon foreground)
 *   assets/icon-background.png  — 1024x1024, solid black (adaptive icon background)
 *   assets/splash.png           — 2732x2732, logo centered on solid black
 *   assets/splash-dark.png      — same (we're a dark-themed app)
 *
 * Source logo: ../bodybank/public/img/Bodybank logo.png  (1000x1000, gold ringed BB monogram)
 *
 * Brand background: #0a0a0a (matches index.html theme-color).
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_LOGO = path.resolve(ROOT, '..', 'bodybank', 'public', 'img', 'Bodybank logo.png');
const OUT_DIR = path.resolve(ROOT, 'assets');

const BG_HEX = '#0a0a0a';
const BG_RGB = { r: 10, g: 10, b: 10, alpha: 1 };

const ICON_SIZE = 1024;
const SPLASH_SIZE = 2732;

// How much of the canvas the logo should occupy (width).
// Adaptive icon "safe zone" is the inner 66% of the canvas; foreground must fit inside.
const ICON_LOGO_RATIO = 0.78;        // legacy icon — bolder
const ICON_FOREGROUND_RATIO = 0.65;  // adaptive foreground — fits safe zone
const SPLASH_LOGO_RATIO = 0.28;      // splash — comfortable

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function buildIconLegacy() {
  const logoW = Math.round(ICON_SIZE * ICON_LOGO_RATIO);
  const resized = await sharp(SOURCE_LOGO)
    .resize(logoW, logoW, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();

  const out = path.join(OUT_DIR, 'icon.png');
  await sharp({
    create: { width: ICON_SIZE, height: ICON_SIZE, channels: 4, background: BG_RGB }
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(out);
  console.log('  wrote', path.basename(out));
}

async function buildIconForeground() {
  const logoW = Math.round(ICON_SIZE * ICON_FOREGROUND_RATIO);
  const resized = await sharp(SOURCE_LOGO)
    .resize(logoW, logoW, { fit: 'inside' })
    .png()
    .toBuffer();

  const out = path.join(OUT_DIR, 'icon-foreground.png');
  await sharp({
    create: { width: ICON_SIZE, height: ICON_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(out);
  console.log('  wrote', path.basename(out));
}

async function buildIconBackground() {
  const out = path.join(OUT_DIR, 'icon-background.png');
  await sharp({
    create: { width: ICON_SIZE, height: ICON_SIZE, channels: 4, background: BG_RGB }
  })
    .png()
    .toFile(out);
  console.log('  wrote', path.basename(out));
}

async function buildSplash(fileName) {
  const logoW = Math.round(SPLASH_SIZE * SPLASH_LOGO_RATIO);
  const resized = await sharp(SOURCE_LOGO)
    .resize(logoW, logoW, { fit: 'inside' })
    .png()
    .toBuffer();

  const out = path.join(OUT_DIR, fileName);
  await sharp({
    create: { width: SPLASH_SIZE, height: SPLASH_SIZE, channels: 4, background: BG_RGB }
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(out);
  console.log('  wrote', path.basename(out));
}

(async () => {
  if (!fs.existsSync(SOURCE_LOGO)) {
    console.error('[build-assets] ERROR: source logo not found:', SOURCE_LOGO);
    process.exit(1);
  }
  await ensureDir(OUT_DIR);
  console.log('[build-assets] Source:', SOURCE_LOGO);
  console.log('[build-assets] Output:', OUT_DIR);
  console.log('[build-assets] Background:', BG_HEX);

  await buildIconLegacy();
  await buildIconForeground();
  await buildIconBackground();
  await buildSplash('splash.png');
  await buildSplash('splash-dark.png');

  console.log('[build-assets] Done.');
})().catch(err => {
  console.error('[build-assets] FAILED:', err);
  process.exit(1);
});
