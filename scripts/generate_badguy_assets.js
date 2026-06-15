#!/usr/bin/env node
'use strict';
// Deterministic top-down proof-to-runtime strips for the licensed monster pack.
// These preserve the pack identities while matching the current 24px enemy
// convention: idle, walk, attack, hurt.
const path = require('path');
const png = require('./lib/pixel-png');
const { recordManifest } = require('./lib/asset-pipeline');

const OUT = path.join(__dirname, '..', 'assets', 'pixel');
const FRAMES = ['idle', 'walk', 'attack', 'hurt'];

const specs = [
  { name: 'flying-eye', source: 'Monster Creatures Fantasy v1.3 — Flying eye', draw: drawFlyingEye },
  { name: 'mushroom', source: 'Monster Creatures Fantasy v1.3 — Mushroom', draw: drawMushroom },
];

function rgba(hex, a = 255) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

function image(width, height) {
  const img = png.newImage(width, height);
  const set = (x, y, c) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    img.pixels[i] = c[0]; img.pixels[i + 1] = c[1]; img.pixels[i + 2] = c[2]; img.pixels[i + 3] = c[3] == null ? 255 : c[3];
  };
  const rect = (x, y, w, h, c) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, c);
  };
  const ellipse = (cx, cy, rx, ry, c) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) set(x, y, c);
      }
    }
  };
  const line = (x0, y0, x1, y1, c) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) set(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps, c);
  };
  return { img, set, rect, ellipse, line };
}

function drawFlyingEye(api, ox, frame) {
  const outline = rgba('#2a1813');
  const wingDark = rgba('#4b3326');
  const wing = rgba('#7b583b');
  const cream = rgba('#e8d9b9');
  const iris = rgba('#b65a48');
  const pupil = rgba('#140c0b');
  const glow = rgba('#f0b66b');
  const hurt = rgba('#f1c4b8');
  const bob = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  const cx = ox + 12, cy = 12 + bob;

  // Wings read as radial appendages in top-down view instead of side profile.
  const wingUp = frame === 1 || frame === 2;
  api.line(cx - 5, cy - 2, ox + 4, cy + (wingUp ? -6 : -2), outline);
  api.line(cx + 5, cy - 2, ox + 20, cy + (wingUp ? -6 : -2), outline);
  api.ellipse(ox + 5, cy + (wingUp ? -5 : -1), 4, 2, wingDark);
  api.ellipse(ox + 19, cy + (wingUp ? -5 : -1), 4, 2, wingDark);
  api.ellipse(ox + 5, cy + (wingUp ? -4 : 0), 3, 2, wing);
  api.ellipse(ox + 19, cy + (wingUp ? -4 : 0), 3, 2, wing);

  api.ellipse(cx, cy, 6, 5, outline);
  api.ellipse(cx, cy, 5, 4, frame === 3 ? hurt : cream);
  api.ellipse(cx, cy, 2, 2, iris);
  api.rect(cx - 1, cy - 1, 2, 2, pupil);
  api.set(cx + 1, cy - 1, rgba('#fff4d2'));

  if (frame === 2) {
    api.rect(cx - 1, cy + 6, 2, 2, glow);
    api.rect(cx - 4, cy + 8, 8, 1, glow);
  }
  if (frame === 3) {
    api.line(cx - 5, cy - 5, cx - 2, cy - 2, iris);
    api.line(cx + 5, cy - 5, cx + 2, cy - 2, iris);
  }
}

function drawMushroom(api, ox, frame) {
  const outline = rgba('#2b1718');
  const cap = rgba('#6f2630');
  const capLight = rgba('#9f3e45');
  const gill = rgba('#d7b494');
  const body = rgba('#ead8b8');
  const shade = rgba('#a67d68');
  const spore = rgba('#b88cff');
  const hurt = rgba('#f1c4b8');
  const bob = frame === 1 ? 1 : 0;
  const cx = ox + 12, cy = 11 + bob;

  api.ellipse(cx, cy - 1, 7, 5, outline);
  api.ellipse(cx, cy - 2, 6, 4, frame === 3 ? hurt : cap);
  api.rect(cx - 5, cy + 1, 10, 2, outline);
  api.rect(cx - 4, cy + 1, 8, 2, gill);
  api.ellipse(cx, cy + 6, 4, 5, outline);
  api.ellipse(cx, cy + 5, 3, 4, body);
  api.rect(cx - 1, cy + 4, 2, 5, shade);
  api.rect(cx - 4, cy - 4, 2, 1, capLight);
  api.rect(cx + 2, cy - 5, 2, 1, capLight);

  if (frame === 1) {
    api.rect(cx - 5, cy + 10, 3, 1, outline);
    api.rect(cx + 2, cy + 10, 3, 1, outline);
  }
  if (frame === 2) {
    api.set(cx - 7, cy - 6, spore);
    api.set(cx + 7, cy - 6, spore);
    api.set(cx - 5, cy - 8, spore);
    api.set(cx + 5, cy - 8, spore);
    api.rect(cx - 3, cy - 7, 6, 1, spore);
  }
  if (frame === 3) {
    api.line(cx - 5, cy - 5, cx - 2, cy - 2, outline);
    api.line(cx + 5, cy - 5, cx + 2, cy - 2, outline);
  }
}

function build(spec) {
  const frameW = 24, frameH = 24;
  const api = image(frameW * FRAMES.length, frameH);
  FRAMES.forEach((_, frame) => spec.draw(api, frame * frameW, frame));
  const file = `${spec.name}.png`;
  png.writeImage(api.img, path.join(OUT, file));
  recordManifest(OUT, {
    name: spec.name,
    type: 'strip',
    layout: 'row',
    frameW,
    frameH,
    file,
    frames: FRAMES,
    source: spec.source,
  });
  return file;
}

for (const spec of specs) console.log(`wrote ${build(spec)}`);
