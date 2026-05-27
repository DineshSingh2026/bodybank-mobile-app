#!/usr/bin/env node
/*
 * Builds store-listing assets for Play Console submission:
 *   store-assets/icon-512.png         — 512x512 Play Store icon (required)
 *   store-assets/feature-1024x500.png — 1024x500 feature graphic (required)
 *
 * These are NOT bundled in the app. They are uploaded separately in Play Console.
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_LOGO = path.resolve(ROOT, 'assets', 'icon.png');           // 1024x1024 logo on black we built earlier
const SOURCE_LOGO_TRANSPARENT = path.resolve(ROOT, 'assets', 'icon-foreground.png'); // logo on transparent
const OUT_DIR = path.resolve(ROOT, 'store-assets');

const GOLD = '#c8a44e';
const CREAM = '#bfb9ab';
const BG = '#0a0a0a';

async function ensureDir(p) { await fs.promises.mkdir(p, { recursive: true }); }

async function buildPlayIcon512() {
  // The Play Store icon must be 512x512 PNG, no transparency, no rounded corners.
  const out = path.join(OUT_DIR, 'icon-512.png');
  await sharp(SOURCE_LOGO).resize(512, 512, { fit: 'cover' }).png().toFile(out);
  console.log('  wrote', path.basename(out));
}

async function buildFeatureGraphic() {
  // 1024x500 feature graphic. Layout:
  //   Left half: logo
  //   Right half: BODYBANK wordmark + tagline (rendered via SVG composite)
  const out = path.join(OUT_DIR, 'feature-1024x500.png');

  const logoSize = 360;
  const logoBuf = await sharp(SOURCE_LOGO_TRANSPARENT)
    .resize(logoSize, logoSize, { fit: 'inside' })
    .png()
    .toBuffer();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#d0b058"/>
          <stop offset="50%" stop-color="#c8a44e"/>
          <stop offset="100%" stop-color="#a68c3e"/>
        </linearGradient>
      </defs>
      <text x="490" y="225"
            font-family="Impact, 'Arial Black', sans-serif"
            font-size="92"
            font-weight="900"
            letter-spacing="6"
            fill="url(#g)">BODYBANK</text>
      <line x1="490" y1="248" x2="600" y2="248" stroke="${GOLD}" stroke-width="2"/>
      <text x="490" y="285"
            font-family="Arial, sans-serif"
            font-size="17"
            font-weight="600"
            letter-spacing="3"
            fill="${CREAM}">REAL  &#8226;  SUSTAINABLE  &#8226;  TRANSFORMATION</text>
      <text x="490" y="335"
            font-family="Arial, sans-serif"
            font-size="15"
            font-weight="300"
            letter-spacing="2"
            fill="${CREAM}" opacity="0.6">Train. Track. Transform your body.</text>
    </svg>
  `;

  await sharp({
    create: { width: 1024, height: 500, channels: 4, background: BG }
  })
    .composite([
      { input: logoBuf, left: 70, top: Math.round((500 - logoSize) / 2) },
      { input: Buffer.from(svg), left: 0, top: 0 }
    ])
    .png()
    .toFile(out);
  console.log('  wrote', path.basename(out));
}

(async () => {
  if (!fs.existsSync(SOURCE_LOGO)) {
    console.error('[build-store-assets] ERROR: missing', SOURCE_LOGO, '— run npm run build:assets first');
    process.exit(1);
  }
  await ensureDir(OUT_DIR);
  console.log('[build-store-assets] Output:', OUT_DIR);
  await buildPlayIcon512();
  await buildFeatureGraphic();
  console.log('[build-store-assets] Done.');
})().catch(err => {
  console.error('[build-store-assets] FAILED:', err);
  process.exit(1);
});
