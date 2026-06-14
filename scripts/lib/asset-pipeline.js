'use strict';
// RUNECHAIN asset-creation boilerplate. One method per asset TYPE, all building
// on three low-level packers (directions / strip / grid) + a tileset normalizer.
// Inputs are PixelLab exports (8-bit RGBA PNGs with alpha); outputs are the
// packed sheets the game already consumes via ASSETS + drawSheet/drawDirectional.
//
// Pixel art is made in PixelLab; these methods only IMPORT + PACK it. Every
// importer also records the result in assets/pixel/manifest.json so wiring a new
// asset into the game (or handing it to Codex/an agent) is one lookup, not guesswork.
const fs = require('fs');
const path = require('path');
const png = require('./pixel-png');

const PIXEL_DIR = path.join(__dirname, '..', '..', 'assets', 'pixel');

// PixelLab's 8-direction rotation order (matches import_pixellab_character.js +
// the PLAYER_DIR_ORDER the renderer indexes).
const DIRECTIONS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];

// ---------------------------------------------------------------------------
// Low-level packers
// ---------------------------------------------------------------------------

// 8 (or N) directional poses -> one horizontal strip of `frameSize` cells.
// Source: a folder of per-direction PNGs named <direction>.png. Engine-ready
// (drawDirectionalPlayer reads frame = PLAYER_DIR_ORDER.indexOf(dir)).
function packDirections({ srcDir, name, outDir = PIXEL_DIR, frameSize = 56, directions = DIRECTIONS, margin = 5 }) {
  const sheet = png.newImage(frameSize * directions.length, frameSize);
  const meta = { name, type: 'directions', layout: 'row', frameW: frameSize, frameH: frameSize,
    file: `${name}-directions.png`, order: directions, directions: {} };
  directions.forEach((dir, index) => {
    const file = path.join(srcDir, `${dir}.png`);
    if (!fs.existsSync(file)) throw new Error(`Missing rotation PNG: ${file}`);
    const img = png.decodePng(file);
    const bounds = png.alphaBounds(img, { threshold: 12, margin });
    const scale = png.fitScale(bounds, frameSize - 8, frameSize - 6);
    const w = Math.max(1, Math.round(bounds.w * scale));
    const h = Math.max(1, Math.round(bounds.h * scale));
    const dx0 = index * frameSize + Math.floor((frameSize - w) / 2);
    const dy0 = frameSize - h - 3; // feet near the bottom of the cell
    png.blitInto(img, bounds, sheet, sheet.width, dx0, dy0, w, h);
    meta.directions[dir] = { scaled: { w, h, x: dx0 - index * frameSize, y: dy0 } };
  });
  return write(sheet, meta, outDir, `${name}-directions.png`);
}

// N animation frames -> one horizontal strip of `frameW` x `frameH` cells.
// Source: explicit `files` (in order) or a folder of PNGs (natural-sorted).
// Engine-ready (drawSheet draws cell = frame * frameW). This is the existing
// monster convention: idle, walk, attack/cast, hurt/death.
function packStrip({ files, srcDir, name, outDir = PIXEL_DIR, frameW = 24, frameH = 24, frames, margin = 2, baseline = 2 }) {
  const list = (files && files.length) ? files : collectPngs(srcDir);
  if (!list.length) throw new Error(`No frame PNGs found for "${name}" (srcDir=${srcDir})`);
  const sheet = png.newImage(frameW * list.length, frameH);
  const labels = frames && frames.length ? frames : defaultFrameLabels(list.length);
  const meta = { name, type: 'strip', layout: 'row', frameW, frameH, file: `${name}.png`, frames: labels };
  list.forEach((file, index) => {
    const img = png.decodePng(file);
    const bounds = png.alphaBounds(img, { threshold: 12, margin });
    const scale = png.fitScale(bounds, frameW - 2, frameH - baseline);
    const w = Math.max(1, Math.round(bounds.w * scale));
    const h = Math.max(1, Math.round(bounds.h * scale));
    const dx0 = index * frameW + Math.floor((frameW - w) / 2);
    const dy0 = frameH - h - baseline;
    png.blitInto(img, bounds, sheet, sheet.width, dx0, dy0, w, h);
  });
  return write(sheet, meta, outDir, `${name}.png`);
}

// directions x frames -> a grid (rows = directions, cols = animation frames).
// Source folder PNGs named <direction>-<frameIndex>.png (e.g. south-0.png).
// For fully animated, rotatable creatures. NOTE: the current renderer only draws
// single ROWS; a directional-anim draw path lands with the engine work (task 5).
function packGrid({ srcDir, name, outDir = PIXEL_DIR, frameW = 32, frameH = 32, directions = DIRECTIONS, cols = 4, margin = 2, baseline = 2 }) {
  const sheet = png.newImage(frameW * cols, frameH * directions.length);
  const meta = { name, type: 'grid', layout: 'grid', frameW, frameH, file: `${name}.png`,
    rows: directions.length, cols, order: directions };
  directions.forEach((dir, r) => {
    for (let c = 0; c < cols; c++) {
      const file = path.join(srcDir, `${dir}-${c}.png`);
      if (!fs.existsSync(file)) continue; // sparse animations are allowed
      const img = png.decodePng(file);
      const bounds = png.alphaBounds(img, { threshold: 12, margin });
      const scale = png.fitScale(bounds, frameW - 2, frameH - baseline);
      const w = Math.max(1, Math.round(bounds.w * scale));
      const h = Math.max(1, Math.round(bounds.h * scale));
      const dx0 = c * frameW + Math.floor((frameW - w) / 2);
      const dy0 = r * frameH + (frameH - h - baseline);
      png.blitInto(img, bounds, sheet, sheet.width, dx0, dy0, w, h);
    }
  });
  return write(sheet, meta, outDir, `${name}.png`);
}

// Normalize an arbitrary terrain/prop sheet (your static map grabs) into a clean
// RGBA atlas + a tile index. Slices on a `tile`-px grid; emits {id,sx,sy} per cell
// so drawAtlasTile(id, sx, sy) can address them.
function importTileset({ srcFile, name = 'tiles', outDir = PIXEL_DIR, tile = 16 }) {
  const img = png.decodePng(srcFile);
  const cols = Math.floor(img.width / tile);
  const rows = Math.floor(img.height / tile);
  if (cols < 1 || rows < 1) throw new Error(`Tileset ${srcFile} is smaller than one ${tile}px tile`);
  const tiles = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) tiles.push({ id: r * cols + c, sx: c * tile, sy: r * tile });
  const meta = { name, type: 'tileset', tile, cols, rows, file: `${name}.png`, tiles };
  png.writeImage(img, path.join(outDir, `${name}.png`)); // re-encode to the canonical RGBA PNG
  recordManifest(outDir, meta);
  fs.writeFileSync(path.join(outDir, `${name}.json`), `${JSON.stringify(meta, null, 2)}\n`);
  return meta;
}

// ---------------------------------------------------------------------------
// Per-type boilerplate: thin, named wrappers with the convention for each class.
// Override any default via opts (frameSize, frameW/frameH, frames, directions).
// ---------------------------------------------------------------------------

// Playable hero / the Recorded: 8-direction rotations, 56px (matches the player).
function importHero(name, srcDir, opts = {}) {
  return packDirections({ name, srcDir, frameSize: 56, ...opts });
}

// Town NPC / quest-giver: 8-direction rotations, smaller cell.
function importNpc(name, srcDir, opts = {}) {
  return packDirections({ name, srcDir, frameSize: 40, ...opts });
}

// Standard monster: 4-frame strip (idle, walk, attack, hurt), 24px.
function importMonster(name, src, opts = {}) {
  return packStrip({ name, ...resolveStrip(src), frameW: 24, frameH: 24,
    frames: ['idle', 'walk', 'attack', 'hurt'], ...opts });
}

// Mini-boss / boss: larger strip (more frames allowed), 48px.
function importBoss(name, src, opts = {}) {
  return packStrip({ name, ...resolveStrip(src), frameW: 48, frameH: 48, baseline: 3, ...opts });
}

// Fully animated, rotatable creature: directions x frames grid.
function importCreature(name, srcDir, opts = {}) {
  return packGrid({ name, srcDir, frameW: 32, frameH: 32, ...opts });
}

// Static / short-anim prop or interactable (candle, bell, tablet, gravestone).
function importProp(name, src, opts = {}) {
  return packStrip({ name, ...resolveStrip(src), frameW: 16, frameH: 16, baseline: 0, margin: 1, ...opts });
}

// Projectile / FX puff: tiny strip.
function importProjectile(name, src, opts = {}) {
  return packStrip({ name, ...resolveStrip(src), frameW: 12, frameH: 12, baseline: 0, margin: 0, ...opts });
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function resolveStrip(src) {
  if (Array.isArray(src)) return { files: src };
  return { srcDir: src };
}

// Collect PNGs in a folder, natural-sorted by any trailing number (frame_0, frame_10...).
function collectPngs(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.png'))
    .sort((a, b) => {
      const na = numOf(a), nb = numOf(b);
      if (na !== nb) return na - nb;
      return a.localeCompare(b);
    })
    .map(f => path.join(dir, f));
}

function numOf(f) {
  const m = f.match(/(\d+)(?=\.[^.]+$)/);
  return m ? parseInt(m[1], 10) : 0;
}

function defaultFrameLabels(n) {
  const std = ['idle', 'walk', 'attack', 'hurt'];
  if (n === 4) return std;
  return Array.from({ length: n }, (_, i) => `frame${i}`);
}

function write(sheet, meta, outDir, file) {
  fs.mkdirSync(outDir, { recursive: true });
  png.writeImage(sheet, path.join(outDir, file));
  recordManifest(outDir, meta);
  return meta;
}

// Single source of truth: assets/pixel/manifest.json keyed by asset name.
function recordManifest(outDir, meta) {
  const file = path.join(outDir, 'manifest.json');
  let manifest = {};
  if (fs.existsSync(file)) { try { manifest = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { manifest = {}; } }
  const slim = { ...meta };
  delete slim.directions; delete slim.tiles; // keep the manifest index lean
  manifest[meta.name] = slim;
  const sorted = {};
  for (const k of Object.keys(manifest).sort()) sorted[k] = manifest[k];
  fs.writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`);
}

module.exports = {
  DIRECTIONS,
  packDirections, packStrip, packGrid, importTileset,
  importHero, importNpc, importMonster, importBoss, importCreature, importProp, importProjectile,
  collectPngs, recordManifest,
};
