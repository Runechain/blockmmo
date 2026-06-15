#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { decodePng } = require('./lib/pixel-png');

const ROOT = path.join(__dirname, '..');
const PIXEL_DIR = path.join(ROOT, 'assets', 'pixel');
const INDEX = path.join(ROOT, 'index.html');
const MANIFEST = path.join(PIXEL_DIR, 'manifest.json');

const expected = [
  { key: 'flying-eye', file: 'flying-eye.png', frameW: 24, frameH: 24, frames: ['idle', 'walk', 'attack', 'hurt'] },
  { key: 'mushroom', file: 'mushroom.png', frameW: 24, frameH: 24, frames: ['idle', 'walk', 'attack', 'hurt'] },
];

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const html = fs.readFileSync(INDEX, 'utf8');

for (const asset of expected) {
  const meta = manifest[asset.key];
  assert(meta, `Missing manifest entry: ${asset.key}`);
  assert(meta.type === 'strip', `${asset.key} manifest type should be strip`);
  assert(meta.file === asset.file, `${asset.key} manifest file should be ${asset.file}`);
  assert(meta.frameW === asset.frameW && meta.frameH === asset.frameH,
    `${asset.key} frame size should be ${asset.frameW}x${asset.frameH}`);
  assert(JSON.stringify(meta.frames) === JSON.stringify(asset.frames),
    `${asset.key} frames should be ${asset.frames.join(',')}`);

  const img = decodePng(path.join(PIXEL_DIR, asset.file));
  assert(img.width === asset.frameW * asset.frames.length && img.height === asset.frameH,
    `${asset.file} dimensions should be ${asset.frameW * asset.frames.length}x${asset.frameH}`);

  assert(html.includes(`'${asset.key}':{src:'assets/pixel/${asset.file}',w:${asset.frameW},h:${asset.frameH},img:null}`) ||
    html.includes(`${asset.key}:{src:'assets/pixel/${asset.file}',w:${asset.frameW},h:${asset.frameH},img:null}`),
    `index.html ASSETS missing ${asset.key}`);
  assert(html.includes(`${asset.key}:{key:'${asset.key}',asset:'${asset.key}'`) ||
    html.includes(`'${asset.key}':{key:'${asset.key}',asset:'${asset.key}'`),
    `index.html TYPES missing ${asset.key}`);
}

console.log('badguy asset verification passed');
