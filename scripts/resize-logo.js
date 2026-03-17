#!/usr/bin/env node
/**
 * Crée les 3 variantes du logo (1x, 2x, 3x) à partir de steam-logov2.png
 */
const path = require('path');
const fs = require('fs');

const sharp = require('sharp');

const SRC = path.join(__dirname, '../src/assets/steam-logov2.png');
const OUT_DIR = path.join(__dirname, '../src/assets');

const SIZES = [
  { name: 'steam-logov2.png', size: 192 },
  { name: 'steam-logov2@2x.png', size: 384 },
  { name: 'steam-logov2@3x.png', size: 576 },
];

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error('Source logo not found:', SRC);
    process.exit(1);
  }

  const inputBuffer = await sharp(SRC).toBuffer();
  for (const { name, size } of SIZES) {
    const outPath = path.join(OUT_DIR, name);
    await sharp(inputBuffer)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`Created ${name} (${size}x${size})`);
  }
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
