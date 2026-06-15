const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { decodePng } = require('./lib/pixel-png');

const root = path.join(__dirname, '..');
const content = require(path.join(root, 'game', 'content.js'));
const heroPath = path.join(root, 'assets', 'pixel', 'hero-knight-directions.png');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert(content.ASSETS.heroKnightDir, 'content should expose heroKnightDir');
assert.strictEqual(content.ASSETS.heroKnightDir.w, 56, 'heroKnightDir frame width should match town renderer');
assert.strictEqual(content.ASSETS.heroKnightDir.h, 56, 'heroKnightDir frame height should match town renderer');
assert(fs.existsSync(heroPath), 'hero-knight-directions.png should exist');

const img = decodePng(heroPath);
assert.strictEqual(img.width, 56 * 8, 'hero knight direction sheet should have 8 frames');
assert.strictEqual(img.height, 56, 'hero knight direction sheet should use 56px frames');

let opaque = 0;
for (let i = 3; i < img.pixels.length; i += 4) if (img.pixels[i] > 0) opaque++;
assert(opaque > 1000, 'hero knight direction sheet should contain visible sprites');

assert(index.includes('function drawHeroKnightPlayer'), 'town renderer should have a hero knight draw path');
assert(index.includes("drawHeroKnightPlayer(p)"), 'local player should use the hero knight draw path');

console.log('hero knight verification passed');
