#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const content = require(path.join(root, 'game', 'content.js'));
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const npcSprites = new Set();
for (const npc of content.NPCS || []) if (npc.sprite) npcSprites.add(npc.sprite);
for (const interior of content.INTERIORS || []) {
  for (const npc of interior.npcs || []) if (npc.sprite) npcSprites.add(npc.sprite);
}

assert(npcSprites.size > 0, 'NPC content should carry sprite keys');
for (const key of npcSprites) {
  assert(content.ASSETS[key], `NPC sprite ${key} should exist in ASSETS`);
}

assert(
  /function drawNpcs\(\)[\s\S]*n\.sprite&&drawSheet\(n\.sprite/.test(index),
  'drawNpcs should render NPC sprite keys before falling back to rectangle art'
);
assert(
  /if\(!drewSprite\)\{[\s\S]*robe \/ body/.test(index),
  'drawNpcs should keep rectangle art only as a missing-asset fallback'
);

console.log('npc sprite rendering verification passed');
