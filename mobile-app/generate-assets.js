/**
 * Run once to generate proper PNG assets from logo.webp:
 *   npm install sharp --save-dev
 *   node generate-assets.js
 */
const sharp = require('sharp');
const path = require('path');

const NAVY = { r: 11, g: 28, b: 61, alpha: 1 };

async function make(width, height, logoSize, outFile) {
  const logoBuffer = await sharp('./assets/logo.webp')
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: { width, height, channels: 4, background: NAVY },
  })
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png()
    .toFile(outFile);

  console.log(`✓ ${outFile}`);
}

(async () => {
  // App icon (1024×1024) — logo fills 70% of icon
  await make(1024, 1024, 720, './assets/icon.png');

  // Adaptive icon foreground (1024×1024) — logo a bit smaller for safe area
  await make(1024, 1024, 640, './assets/adaptive-icon.png');

  // Splash screen (1284×2778 — iPhone 14 Pro Max resolution, scales down)
  await make(1284, 2778, 800, './assets/splash.png');

  console.log('\nAll assets generated. Now run: npx expo start --clear');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
