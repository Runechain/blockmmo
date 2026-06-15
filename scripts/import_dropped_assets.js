#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const pipe = require('./lib/asset-pipeline');
const png = require('./lib/pixel-png');

const ROOT = path.resolve(__dirname, '..');
const PIXEL_DIR = path.join(ROOT, 'assets', 'pixel');
const SOURCE_DIR = path.join(ROOT, 'assets', 'source');

const DROPS = {
  kenney: {
    id: 'kenney-roguelike',
    src: '/Users/angusdurrie/Downloads/kenney_roguelike-rpg-pack',
    credit: 'Kenney Roguelike/RPG pack (CC0)',
  },
  freeKnight: {
    id: 'free-knight',
    src: '/Users/angusdurrie/Downloads/FreeKnight_v1',
    credit: 'FreeKnight_v1, user-supplied local asset drop',
  },
  monsters: {
    id: 'monster-creatures-fantasy',
    src: '/Users/angusdurrie/Downloads/Monster_Creatures_Fantasy(Version 1.3)',
    credit: 'Monster Creatures Fantasy v1.3, user-confirmed licensed',
  },
  items: {
    id: 'items',
    src: '/Users/angusdurrie/Downloads/Existing Folders/items',
    credit: 'Items icon pack, user-supplied local asset drop',
  },
};

const FREE_KNIGHT_SHEETS = [
  ['free-knight-idle', '_Idle.png', 120, 80, 10],
  ['free-knight-run', '_Run.png', 120, 80, 10],
  ['free-knight-jump', '_Jump.png', 120, 80, 3],
  ['free-knight-fall', '_Fall.png', 120, 80, 3],
  ['free-knight-attack', '_Attack.png', 120, 80, 4],
  ['free-knight-hit', '_Hit.png', 120, 80, 1],
  ['free-knight-death', '_Death.png', 120, 80, 10],
];

const PLATFORM_MONSTERS = [
  ['pf-flying-eye', 'Flying eye/Attack3.png', 150, 150, 64, 64, 6],
  ['pf-goblin', 'Goblin/Attack3.png', 150, 150, 64, 64, 12],
  ['pf-mushroom', 'Mushroom/Attack3.png', 150, 150, 64, 64, 11],
  ['pf-skeleton', 'Skeleton/Attack3.png', 150, 150, 64, 64, 6],
];

const PLATFORM_PROJECTILES = [
  ['pf-flying-eye-projectile', 'Flying eye/projectile_sprite.png', 48, 48, 8],
  ['pf-goblin-bomb', 'Goblin/Bomb_sprite.png', 100, 100, 19],
  ['pf-mushroom-projectile', 'Mushroom/Projectile_sprite.png', 50, 50, 8],
  ['pf-skeleton-sword', 'Skeleton/Sword_sprite.png', 92, 102, 8],
];

const RELIC_ICONS = [
  ['relic-ember-edge', 'item17.png'],
  ['relic-warden-sigil', 'item152.png'],
  ['relic-green-knot', 'item30.png'],
  ['relic-rune-lens', 'item135.png'],
  ['relic-tallow-brand', 'item149.png'],
];

main();

function main() {
  ensureDropPaths();
  fs.mkdirSync(PIXEL_DIR, { recursive: true });
  fs.mkdirSync(SOURCE_DIR, { recursive: true });

  const sourceIndex = [];
  for (const drop of Object.values(DROPS)) {
    const dest = path.join(SOURCE_DIR, drop.id);
    copyTree(drop.src, dest);
    sourceIndex.push({
      id: drop.id,
      source: drop.src,
      copiedTo: path.relative(ROOT, dest),
      credit: drop.credit,
    });
  }
  fs.writeFileSync(path.join(SOURCE_DIR, 'manifest.json'), `${JSON.stringify(sourceIndex, null, 2)}\n`);

  importFreeKnight();
  importPlatformMonsters();
  importRelicIcons();
  console.log('imported dropped source packs and runtime sprites');
}

function ensureDropPaths() {
  for (const drop of Object.values(DROPS)) {
    if (!fs.existsSync(drop.src)) throw new Error(`Missing dropped asset path: ${drop.src}`);
  }
}

function copyTree(src, dest) {
  if (fs.existsSync(dest)) {
    makeWritable(dest);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, {
    recursive: true,
    force: true,
    filter(file) {
      const base = path.basename(file);
      return base !== '.DS_Store' && !base.endsWith('.url');
    },
  });
  makeWritable(dest);
}

function importFreeKnight() {
  const dir = path.join(DROPS.freeKnight.src, 'Colour1', 'Outline', '120x80_PNGSheets');
  for (const [name, file, frameW, frameH, frameCount] of FREE_KNIGHT_SHEETS) {
    const src = path.join(dir, file);
    const outFile = `${name}.png`;
    mustCopy(src, path.join(PIXEL_DIR, outFile));
    pipe.recordManifest(PIXEL_DIR, {
      name,
      type: 'strip',
      role: 'platformer-hero',
      layout: 'row',
      frameW,
      frameH,
      file: outFile,
      frames: numberedFrames(frameCount),
      source: `${DROPS.freeKnight.id}/${path.relative(DROPS.freeKnight.src, src)}`,
    });
  }
}

function importPlatformMonsters() {
  for (const [name, rel, srcFrameW, srcFrameH, frameW, frameH, frameCount] of PLATFORM_MONSTERS) {
    const src = path.join(DROPS.monsters.src, rel);
    const outFile = `${name}.png`;
    writeNormalizedStrip(src, path.join(PIXEL_DIR, outFile), {
      srcFrameW,
      srcFrameH,
      frameW,
      frameH,
      frameCount,
      margin: 2,
      baseline: 4,
    });
    pipe.recordManifest(PIXEL_DIR, {
      name,
      type: 'strip',
      role: 'platformer-enemy',
      layout: 'row',
      frameW,
      frameH,
      file: outFile,
      frames: numberedFrames(frameCount),
      source: `${DROPS.monsters.id}/${rel}`,
    });
  }

  for (const [name, rel, frameW, frameH, frameCount] of PLATFORM_PROJECTILES) {
    const src = path.join(DROPS.monsters.src, rel);
    const outFile = `${name}.png`;
    mustCopy(src, path.join(PIXEL_DIR, outFile));
    pipe.recordManifest(PIXEL_DIR, {
      name,
      type: 'strip',
      role: 'platformer-projectile',
      layout: 'row',
      frameW,
      frameH,
      file: outFile,
      frames: numberedFrames(frameCount),
      source: `${DROPS.monsters.id}/${rel}`,
    });
  }
}

function importRelicIcons() {
  for (const [name, file] of RELIC_ICONS) {
    const src = path.join(DROPS.items.src, file);
    const outFile = `${name}.png`;
    mustCopy(src, path.join(PIXEL_DIR, outFile));
    pipe.recordManifest(PIXEL_DIR, {
      name,
      type: 'icon',
      role: 'relic-ui',
      layout: 'single',
      frameW: 16,
      frameH: 16,
      file: outFile,
      source: `${DROPS.items.id}/${file}`,
    });
  }
}

function numberedFrames(count) {
  return Array.from({ length: count }, (_, i) => `frame${i}`);
}

function writeNormalizedStrip(src, dest, opts) {
  if (!fs.existsSync(src)) throw new Error(`Missing source asset: ${src}`);
  const image = png.decodePng(src);
  const frames = [];
  for (let i = 0; i < opts.frameCount; i++) {
    const bounds = png.alphaBounds(image, {
      threshold: 12,
      margin: opts.margin || 0,
      region: { x: i * opts.srcFrameW, y: 0, w: opts.srcFrameW, h: opts.srcFrameH },
    });
    frames.push(bounds);
  }
  const max = frames.reduce((acc, b) => ({ w: Math.max(acc.w, b.w), h: Math.max(acc.h, b.h) }), { w: 1, h: 1 });
  const scale = Math.min((opts.frameW - 4) / max.w, (opts.frameH - (opts.baseline || 0)) / max.h);
  const sheet = png.newImage(opts.frameW * opts.frameCount, opts.frameH);
  frames.forEach((bounds, i) => {
    const w = Math.max(1, Math.round(bounds.w * scale));
    const h = Math.max(1, Math.round(bounds.h * scale));
    const dx = i * opts.frameW + Math.floor((opts.frameW - w) / 2);
    const dy = opts.frameH - h - (opts.baseline || 0);
    png.blitInto(image, bounds, sheet, sheet.width, dx, dy, w, h);
  });
  png.writeImage(sheet, dest);
}

function mustCopy(src, dest) {
  if (!fs.existsSync(src)) throw new Error(`Missing source asset: ${src}`);
  fs.copyFileSync(src, dest);
}

function makeWritable(target) {
  const stat = fs.statSync(target);
  fs.chmodSync(target, stat.mode | 0o200);
  if (!stat.isDirectory()) return;
  for (const name of fs.readdirSync(target)) makeWritable(path.join(target, name));
}
