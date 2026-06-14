#!/usr/bin/env node
'use strict';
// Deterministic PLACEHOLDER sprite strips for every NEW registry key, so the game
// renders an identifiable, labeled shape (not a blank) before final PixelLab art
// lands. Hand-made art supersedes these; re-run any time to refresh. Issue #6.
// Each output is a 4-frame strip (idle, walk, attack, hurt) recorded in manifest.json
// with placeholder:true. Uses the shared codec in scripts/lib/pixel-png.js.
const path = require('path');
const png = require('./lib/pixel-png');
const { recordManifest } = require('./lib/asset-pipeline');

const OUT = path.join(__dirname, '..', 'assets', 'pixel');
const FRAMES = ['idle', 'walk', 'attack', 'hurt'];

// Registry keys still missing dedicated art (sexton/mempool/tallow already render
// by reusing knight/sorcerer/sentinel, so they are intentionally omitted).
const KEYS = [
  { name: 'foreman',         size: 64, label: 'FM', accent: '#4fa38f', kind: 'boss' },
  { name: 'bifurcated',      size: 56, label: 'BG', accent: '#d8b36b', accent2: '#6fae6a', kind: 'boss' },
  { name: 'ledgerbound',     size: 80, label: 'LB', accent: '#2f7e76', kind: 'boss' },
  { name: 'scrivener',       size: 64, label: 'SC', accent: '#3a3550', kind: 'boss' },
  { name: 'cascade',         size: 72, label: 'CA', accent: '#cfe0ff', kind: 'boss' },
  { name: 'auditor',         size: 80, label: 'AU', accent: '#9fc7ff', kind: 'boss' },
  { name: 'audit-wolf',      size: 32, label: 'AW', accent: '#26242e', kind: 'enemy' },
  { name: 'tallow-echo',     size: 24, label: 'TE', accent: '#e8dcc2', kind: 'enemy' },
  { name: 'hollow-ancestor', size: 24, label: 'HA', accent: '#6f9e90', kind: 'enemy' },
  { name: 'canon-auditor',   size: 24, label: 'CN', accent: '#d8b36b', kind: 'enemy' },
  { name: 'schism-shadow',   size: 24, label: 'SH', accent: '#6fae6a', kind: 'enemy' },
  { name: 'relic-shade',     size: 24, label: 'RS', accent: '#8a8a96', kind: 'enemy' },
];

// Crude 3x5 uppercase font — enough to read a 2-letter tag on a placeholder.
const FONT = {
  A: ['###', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['###', '#..', '#..', '#..', '###'], E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'], G: ['###', '#..', '#.#', '#.#', '###'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'], N: ['#.#', '##.', '#.#', '#.#', '#.#'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['###', '#..', '###', '..#', '###'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
  W: ['#.#', '#.#', '#.#', '###', '#.#'],
};

function hex(s) { const n = parseInt(s.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function shade(c, f) { return [c[0] * f, c[1] * f, c[2] * f].map(v => Math.max(0, Math.min(255, Math.round(v)))); }
function lighten(c, f) { return c.map(v => Math.round(v + (255 - v) * f)); }
function lum(c) { return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }

function build(spec) {
  const s = spec.size, W = s * FRAMES.length, H = s;
  const img = png.newImage(W, H);
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4; img.pixels[i] = c[0]; img.pixels[i + 1] = c[1]; img.pixels[i + 2] = c[2]; img.pixels[i + 3] = 255;
  };
  const rect = (x, y, w, h, c) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, c); };
  const accent = hex(spec.accent), accent2 = spec.accent2 ? hex(spec.accent2) : null;
  const outline = shade(accent, 0.5);
  const gold = hex('#f1c75b'), mark = hex('#ff35d0');
  const textC = lum(accent) > 0.6 ? hex('#15151c') : hex('#f2f2f5');

  FRAMES.forEach((frame, f) => {
    const ox = f * s;
    const bob = frame === 'walk' ? 1 : 0;
    const bw = Math.round(s * (spec.kind === 'boss' ? 0.5 : 0.46));
    const bh = Math.round(s * 0.5);
    const bx = ox + Math.round((s - bw) / 2);
    const by = s - bh - 2 + bob;
    // body (outline then fill; bifurcated splits left/right)
    rect(bx - 1, by - 1, bw + 2, bh + 2, outline);
    if (accent2) { rect(bx, by, Math.floor(bw / 2), bh, accent); rect(bx + Math.floor(bw / 2), by, Math.ceil(bw / 2), bh, accent2); }
    else rect(bx, by, bw, bh, accent);
    // head
    const hw = Math.round(s * 0.32), hh = Math.round(s * 0.26);
    const hx = ox + Math.round((s - hw) / 2), hy = by - hh + 1;
    rect(hx - 1, hy - 1, hw + 2, hh + 2, outline); rect(hx, hy, hw, hh, accent2 || accent);
    // boss flourish: gold trim + a small crown
    if (spec.kind === 'boss') { rect(bx, by, bw, 1, gold); for (let k = 0; k < 3; k++) set(hx + 1 + k * Math.floor(hw / 3), hy - 2, gold); }
    // frame poses
    if (frame === 'walk') { rect(bx + 1, s - 2, 2, 2, outline); rect(bx + bw - 3, s - 2, 2, 2, outline); }
    if (frame === 'attack') rect(bx + bw, by + Math.round(bh * 0.3), Math.round(s * 0.18), 2, gold);
    if (frame === 'hurt') rect(bx, by, bw, bh, lighten(accent, 0.55));
    // placeholder corner tick
    rect(ox + 1, 1, 3, 1, mark); rect(ox + 1, 1, 1, 3, mark);
    // label
    const txt = spec.label.split('');
    const cw = 3, gap = 1, tw = txt.length * cw + (txt.length - 1) * gap;
    let tx = ox + Math.round((s - tw) / 2), ty = s - 7;
    for (const ch of txt) {
      const g = FONT[ch.toUpperCase()];
      if (g) for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === '#') set(tx + c, ty + r, textC);
      tx += cw + gap;
    }
  });

  png.writeImage(img, path.join(OUT, `${spec.name}.png`));
  recordManifest(OUT, { name: spec.name, type: 'strip', layout: 'row', frameW: s, frameH: s, file: `${spec.name}.png`, frames: FRAMES, placeholder: true });
  return { name: spec.name, w: W, h: H };
}

const made = KEYS.map(build);
console.log(`Generated ${made.length} placeholder strips in assets/pixel/:`);
for (const m of made) console.log(`  ${m.name}.png  (${m.w}x${m.h})`);
console.log('Recorded in assets/pixel/manifest.json (placeholder:true). Replace with PixelLab art per ASSET-PROMPTS.md.');
