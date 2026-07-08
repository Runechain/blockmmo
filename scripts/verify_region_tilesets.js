'use strict';
// Verify that generate_region_tileset.js is self-consistent and covers all S1 regions.
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');

// Load S1 region IDs — use the season manifest when present (feat/season-manifest merged),
// otherwise fall back to the canonical S1 region list.
const s1Path = path.join(ROOT, 'game', 'seasons', 's1.json');
const s1RegionIds = fs.existsSync(s1Path)
  ? JSON.parse(fs.readFileSync(s1Path, 'utf8')).regions.map(r => r.id)
  : ['gracefall-parish', 'mempool-moor', 'shroud-vaults', 'drowned-reach', 'seized-grounds', 'archive-causeway'];

// Load REGION_PROMPTS from the generator (no API key needed, just require())
const { REGION_PROMPTS } = require('./generate_region_tileset.js');

// Every S1 region must have a prompt entry.
for (const id of s1RegionIds) {
  assert(REGION_PROMPTS[id], `Missing prompt for S1 region: ${id}`);
  console.log(`  ok  ${id} → ${REGION_PROMPTS[id].tilesetName}`);
}

// Every prompt entry must have required fields.
for (const [regionId, spec] of Object.entries(REGION_PROMPTS)) {
  assert(spec.tilesetName, `${regionId}: missing tilesetName`);
  assert(typeof spec.description === 'string' && spec.description.length > 20,
    `${regionId}: description too short or missing`);
  assert(spec.tilesetName.startsWith('tileset-'), `${regionId}: tilesetName must start with 'tileset-'`);
}

// No duplicate tileset names.
const names = Object.values(REGION_PROMPTS).map(s => s.tilesetName);
const uniqueNames = new Set(names);
assert(uniqueNames.size === names.length, 'Duplicate tilesetNames in REGION_PROMPTS');

// ASSET-PROMPTS.md references the script.
const assetDoc = fs.readFileSync(path.join(ROOT, 'docs', 'design', 'ASSET-PROMPTS.md'), 'utf8');
assert(assetDoc.includes('generate_region_tileset.js'), 'ASSET-PROMPTS.md must reference generate_region_tileset.js');

// Count: prompts cover all 6 S1 regions.
assert(Object.keys(REGION_PROMPTS).length === s1RegionIds.length,
  `Prompt count (${Object.keys(REGION_PROMPTS).length}) !== S1 region count (${s1RegionIds.length})`);

console.log(`\nverify_region_tilesets: all ${s1RegionIds.length} S1 regions have prompts`);
