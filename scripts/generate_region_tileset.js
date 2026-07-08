#!/usr/bin/env node
'use strict';
// Generate a PixelLab top-down tileset for one S1 region and import it.
//
// Usage:
//   PIXELLAB_API_KEY=<key> node scripts/generate_region_tileset.js <regionId> [--force] [--season <path>]
//
// Examples:
//   node scripts/generate_region_tileset.js gracefall-parish
//   node scripts/generate_region_tileset.js all            (generate all 6 regions)
//   node scripts/generate_region_tileset.js gracefall-parish --force
//
// On completion the tileset lands in assets/pixel/ and is registered in
// assets/pixel/manifest.json via scripts/import_assets.js.

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const API_KEY = process.env.PIXELLAB_API_KEY;
const API_BASE = 'https://api.pixellab.ai';

const ROOT = path.join(__dirname, '..');
const PIXEL_DIR = path.join(ROOT, 'assets', 'pixel');
const DOWNLOAD_DIR = path.join(ROOT, 'assets', 'pixel', '_downloads');

// Per-region prompts — keep in sync with docs/design/ASSET-PROMPTS.md.
const REGION_PROMPTS = {
  'gracefall-parish': {
    tilesetName: 'tileset-gracefall',
    description:
      'Top-down pixel art tileset for a medieval parish town, 16x16 tiles. ' +
      'Style: muted pixel art, thin dark outline, warm earthy tones, golden hour light. ' +
      'Palette: warm gold, amber, aged parchment, dusty sage green, warm stone. ' +
      'Tiles: worn cobblestone path, flagstone chapel floor, crumbling stone wall, ' +
      'arched wooden door, iron fence post, glowing hearthstone (amber/gold), ' +
      'autumn grass with sparse gold leaves, golden moss patch. ' +
      'Administrative ledger-punk feel — record-keeping parish, still functions. ' +
      'No bright colors. Minimal saturation. Original IP.',
  },
  'mempool-moor': {
    tilesetName: 'tileset-mempool',
    description:
      'Top-down pixel art tileset for a foggy moor with decaying infrastructure, 16x16 tiles. ' +
      'Style: muted pixel art, thin dark outline, fog grey and muted teal tones. ' +
      'Palette: fog grey, muted teal, pale moss, dark mud, medium stone. ' +
      'Tiles: boggy waterlogged ground, shallow reed-edged water, cracked paving, ' +
      'mossy broken wall, rusted iron stake (pending-queue marker), mud path with footprints, ' +
      'pale mushroom cluster, fog-shrouded stone. ' +
      'Feel: bureaucratic backlog, unresolved. No bright colors. Original IP.',
  },
  'shroud-vaults': {
    tilesetName: 'tileset-shroud',
    description:
      'Top-down pixel art tileset for ancient sealed vaults beneath crumbling stone, 16x16 tiles. ' +
      'Style: muted pixel art, thin dark outline, dark stone and deep purple tones. ' +
      'Palette: deep charcoal stone, vault grey, dark purple shadow, bone white, rust accent. ' +
      'Tiles: sealed vault-door floor grate, carved archive stone, chain-locked tile, ' +
      'dark corridor wall, bone-pale archive shelf, script-etched floor (faint runes), ' +
      'purple shadow patch, rust-stained iron tile. ' +
      'Feel: archival weight, sealed records, absolute silence. Very dark. Original IP.',
  },
  'drowned-reach': {
    tilesetName: 'tileset-drowned',
    description:
      'Top-down pixel art tileset for a submerged coastal fringe, 16x16 tiles. ' +
      'Style: muted pixel art, thin dark outline, cool blue-green tones with waterlogged warmth. ' +
      'Palette: muted teal, submerged blue-grey, pale sand, waterlogged grey, dark silt. ' +
      'Tiles: shallow rippling water tile, silt mud floor, half-submerged wooden plank, ' +
      'crumbling sea wall, scattered sea-glass fragment, kelp or seaweed patch, ' +
      'rusted iron grate, damp stone path. ' +
      'Feel: things dissolve here, records go unread. Quiet and cold. Original IP.',
  },
  'seized-grounds': {
    tilesetName: 'tileset-seized',
    description:
      'Top-down pixel art tileset for hostile cracked earth near a corruption singularity, 16x16 tiles. ' +
      'Style: muted pixel art, thin dark outline, warm earth and rust tones scorched by proximity to decay. ' +
      'Palette: cracked earth brown, rust red, ash grey, scorched dark stone, pale bone. ' +
      'Tiles: drought-cracked earth floor, rust-stained stone tile, ash and cinder pile, ' +
      'scorched stone wall, chained ledger stone (seized/locked), barbed wire segment, ' +
      'brittle dead brush, fissured ground. ' +
      'Feel: expropriated, hostile, near collapse. Warm but burnt. Original IP.',
  },
  'archive-causeway': {
    tilesetName: 'tileset-archive',
    description:
      'Top-down pixel art tileset for ancient archive ruins at the edge of a consuming void, 16x16 tiles. ' +
      'Style: muted pixel art, thin dark outline, near-black with ash white and faint warm amber highlights only. ' +
      'Palette: near-black void, ash white, deep void shadow, pale yellowed paper, faint amber ember. ' +
      'Tiles: void-dark stone floor, faded archive paper floor tile (old document texture), ' +
      'crumbling causeway stone, partially consumed dark wall, pale ash mound, ' +
      'void crack in floor (dark with faint glow), weathered final record stone. ' +
      'Feel: end of recorded history, barely illuminated, consumed by the Wound. Original IP.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HTTP helpers
// ─────────────────────────────────────────────────────────────────────────────
function request(method, urlStr, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + (url.search || ''),
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        ...(payload ? {
          'Content-Type': 'application/json',
          'Content-Length': payload.length,
        } : {}),
      },
    };
    const req = https.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        if (res.statusCode >= 400) {
          return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 400)}`));
        }
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error(`JSON parse: ${raw.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function httpGet(endpoint) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}/v2${endpoint}`;
  return request('GET', url, null);
}

function httpPost(endpoint, body) {
  return request('POST', `${API_BASE}/v2${endpoint}`, body);
}

// Poll a GET endpoint until status is 'done' or 'failed'.
async function poll(endpoint, intervalMs, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await httpGet(endpoint);
    if (res.status === 'done' || res.status === 'succeeded' || res.image) return res;
    if (res.status === 'failed' || res.status === 'error') {
      throw new Error(`Job failed: ${JSON.stringify(res).slice(0, 200)}`);
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out waiting for tileset generation (${timeoutMs / 1000}s)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate one region tileset
// ─────────────────────────────────────────────────────────────────────────────
async function generateTileset(regionId, force) {
  const spec = REGION_PROMPTS[regionId];
  if (!spec) throw new Error(`Unknown region: ${regionId}. Valid: ${Object.keys(REGION_PROMPTS).join(', ')}`);

  const outFile = path.join(PIXEL_DIR, `${spec.tilesetName}.png`);
  if (!force && fs.existsSync(outFile)) {
    console.log(`  skip ${regionId} (${spec.tilesetName}.png exists, use --force to regenerate)`);
    return;
  }

  console.log(`  → generating ${regionId} tileset (${spec.tilesetName})...`);

  // POST to create the tileset job
  let res;
  try {
    res = await httpPost('/create-topdown-tileset', {
      description: spec.description,
      // 8 columns × 4 rows of 16px tiles = 128×64 sheet
      image_size: { width: 128, height: 64 },
      tile_size: 16,
      no_background: false,
    });
  } catch (err) {
    throw new Error(`PixelLab API error: ${err.message}`);
  }

  // If the API returned synchronously (unlikely for tilesets but handle it)
  let result = res;
  if (res.id && !res.image) {
    console.log(`  job ${res.id} — polling...`);
    result = await poll(`/topdown-tilesets/${res.id}`, 3000, 180000);
  }

  // Extract image bytes (base64 or URL)
  let imageBuffer;
  if (result.image) {
    const img = result.image;
    if (img.base64) {
      const b64 = img.base64.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(b64, 'base64');
    } else if (img.url) {
      // Download from URL
      const urlObj = new URL(img.url);
      imageBuffer = await new Promise((resolve, reject) => {
        const chunks = [];
        const proto = require(urlObj.protocol === 'https:' ? 'https' : 'http');
        proto.get(img.url, res => {
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
      });
    }
  } else if (result.base64) {
    const b64 = result.base64.replace(/^data:image\/\w+;base64,/, '');
    imageBuffer = Buffer.from(b64, 'base64');
  }

  if (!imageBuffer) {
    throw new Error(`No image in PixelLab response: ${JSON.stringify(result).slice(0, 200)}`);
  }

  // Write to downloads dir then import
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  const downloadPath = path.join(DOWNLOAD_DIR, `${spec.tilesetName}.png`);
  fs.writeFileSync(downloadPath, imageBuffer);
  console.log(`  saved ${imageBuffer.length} bytes to ${downloadPath}`);

  // Run import_assets.js tileset
  const importScript = path.join(__dirname, 'import_assets.js');
  console.log(`  importing via import_assets.js...`);
  execFileSync(process.execPath, [
    importScript,
    'tileset',
    '--name', spec.tilesetName,
    '--src', downloadPath,
    '--tile', '16',
  ], { stdio: 'inherit', cwd: ROOT });

  console.log(`  ✓ ${regionId} → ${spec.tilesetName}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const cleanArgs = args.filter(a => !a.startsWith('--'));
  const target = cleanArgs[0];

  if (!target) {
    console.error('Usage: node scripts/generate_region_tileset.js <regionId|all> [--force]');
    console.error('Regions: ' + Object.keys(REGION_PROMPTS).join(', '));
    process.exit(1);
  }

  if (!API_KEY) {
    console.error('Error: set PIXELLAB_API_KEY env variable.');
    process.exit(1);
  }

  const regions = target === 'all' ? Object.keys(REGION_PROMPTS) : [target];
  if (target !== 'all' && !REGION_PROMPTS[target]) {
    console.error(`Unknown region: ${target}`);
    console.error('Valid regions: ' + Object.keys(REGION_PROMPTS).join(', '));
    process.exit(1);
  }

  console.log(`RUNECHAIN region tileset generator (${regions.length} region${regions.length > 1 ? 's' : ''})`);
  console.log('');

  for (const regionId of regions) {
    try {
      await generateTileset(regionId, force);
    } catch (err) {
      console.error(`  ✗ ${regionId}: ${err.message}`);
      if (regions.length === 1) process.exit(1);
    }
    if (regions.indexOf(regionId) < regions.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\nDone.');
}

// Export the prompt map so verify script can check it without running main.
module.exports = { REGION_PROMPTS };

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}
