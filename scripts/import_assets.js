#!/usr/bin/env node
'use strict';
// One entry point for importing PixelLab art into the game, by asset TYPE.
//
//   node scripts/import_assets.js <type> --name <name> --src <path> [options]
//
// Types & the PixelLab export each expects:
//   hero        --src <rotations dir>   8 named PNGs (south.png, south-east.png, ...)   -> <name>-directions.png
//   npc         --src <rotations dir>   same, smaller cell                              -> <name>-directions.png
//   monster     --src <frames dir>      4 anim PNGs (idle, walk, attack, hurt)          -> <name>.png
//   boss        --src <frames dir>      N anim PNGs                                       -> <name>.png
//   creature    --src <frames dir>      <direction>-<frame>.png grid (south-0.png ...)   -> <name>.png
//   prop        --src <frames dir>      1+ PNGs (static or short anim)                   -> <name>.png
//   projectile  --src <frames dir>      1+ tiny PNGs                                      -> <name>.png
//   tileset     --src <sheet.png>       one terrain sheet (your static map grab)         -> <name>.png + <name>.json
//
// Common options: --name, --src, --out, --frame <px> (square cell), --fw / --fh,
//   --frames idle,walk,attack,hurt   --dirs south,east,...   --tile 16   --files a.png,b.png
const pipe = require('./lib/asset-pipeline');

const args = parseArgs(process.argv.slice(2));
const type = args._[0];
if (!type || args.help) { usage(); process.exit(type ? 0 : 1); }

const name = args.name || args._[1];
const src = args.src;
const opts = {};
if (args.out) opts.outDir = args.out;
if (args.frame) { opts.frameSize = +args.frame; opts.frameW = +args.frame; opts.frameH = +args.frame; }
if (args.fw) opts.frameW = +args.fw;
if (args.fh) opts.frameH = +args.fh;
if (args.frames) opts.frames = args.frames.split(',').map(s => s.trim());
if (args.dirs) opts.directions = args.dirs.split(',').map(s => s.trim());
if (args.cols) opts.cols = +args.cols;
if (args.margin != null) opts.margin = +args.margin;
const files = args.files ? args.files.split(',').map(s => s.trim()) : null;

try {
  let meta;
  switch (type) {
    case 'hero': meta = pipe.importHero(need(name), need(src, 'src'), opts); break;
    case 'npc': meta = pipe.importNpc(need(name), need(src, 'src'), opts); break;
    case 'monster': meta = pipe.importMonster(need(name), files || need(src, 'src'), opts); break;
    case 'boss': meta = pipe.importBoss(need(name), files || need(src, 'src'), opts); break;
    case 'creature': meta = pipe.importCreature(need(name), need(src, 'src'), opts); break;
    case 'prop': meta = pipe.importProp(need(name), files || need(src, 'src'), opts); break;
    case 'projectile': meta = pipe.importProjectile(need(name), files || need(src, 'src'), opts); break;
    case 'tileset': meta = pipe.importTileset({ name: name || 'tiles', srcFile: need(src, 'src'), tile: +(args.tile || 16), spacing: +(args.spacing || 0), margin: +(args.margin || 0), ...(args.credit ? { credit: args.credit } : {}), ...(args.out ? { outDir: args.out } : {}) }); break;
    default: console.error(`Unknown type "${type}".`); usage(); process.exit(1);
  }
  console.log(`✓ ${type} "${meta.name}" -> assets/pixel/${meta.file}` +
    (meta.frames ? `  [${meta.frames.join(', ')}]` : '') +
    (meta.rows ? `  [${meta.rows}x${meta.cols} grid]` : '') +
    (meta.tile ? `  [${meta.cols}x${meta.rows} tiles @ ${meta.tile}px]` : ''));
  console.log('  recorded in assets/pixel/manifest.json');
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}

function need(v, label = 'name') {
  if (!v) throw new Error(`Missing required --${label}`);
  return v;
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { out.help = true; continue; }
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

function usage() {
  console.log(`Import PixelLab art into RUNECHAIN, by asset type.

  node scripts/import_assets.js <type> --name <name> --src <path> [options]

Types: hero | npc | monster | boss | creature | prop | projectile | tileset
See scripts/ASSETS.md for export conventions, options, and how to wire an
imported asset into the game's ASSETS table.`);
}
