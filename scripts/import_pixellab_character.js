#!/usr/bin/env node
'use strict';
// Back-compat shim. Imports the player's 8-direction PixelLab rotation sheet.
// Equivalent to: node scripts/import_assets.js hero --name player --src <rotations>
// The PNG codec + packing now live in scripts/lib (see scripts/ASSETS.md).
const fs = require('fs');
const path = require('path');
const { importHero } = require('./lib/asset-pipeline');

const defaultSource = path.join(
  process.env.HOME || '', 'Downloads',
  'A_tarnished_warrior_standing_in (1)', 'A_tarnished_warrior_standing_in', 'rotations'
);

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const srcDir = args.get('--src') || defaultSource;
const frameSize = Number(args.get('--frame') || 56);

let meta;
try {
  meta = importHero('player', srcDir, { frameSize });
} catch (err) {
  console.error(`✗ ${err.message}`);
  console.error(`  Pass the PixelLab rotations folder with --src <dir> (8 named PNGs).`);
  process.exit(1);
}

// Preserve the original informational sidecar (the game reads the PNG, not this).
const outDir = path.join(__dirname, '..', 'assets', 'pixel');
fs.writeFileSync(
  path.join(outDir, 'player-directions.json'),
  `${JSON.stringify({ source: srcDir, ...meta }, null, 2)}\n`
);
console.log(`Imported PixelLab character sheet: assets/pixel/${meta.file}`);
