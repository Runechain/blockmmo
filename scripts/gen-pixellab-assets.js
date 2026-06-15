#!/usr/bin/env node
'use strict';
// Generate all RUNECHAIN game sprites via the PixelLab REST API.
//
// Usage: PIXELLAB_API_KEY=<key> node scripts/gen-pixellab-assets.js [--only <name>] [--force]
//
// Workflow:
//   1. Generate player character first (style anchor, no reference)
//   2. Decode player's SOUTH image → use as reference for all subsequent characters
//   3. Each character's 4 direction images (south/east/west/north) become a 4-frame
//      animation strip: idle / walk / attack / hurt
//   4. Strip PNGs are written directly to assets/pixel/, manifest.json updated
//
// The PixelLab API is synchronous for create-character-with-4-directions.
// Base URL: https://api.pixellab.ai/v2
// Auth: Authorization: Bearer <PIXELLAB_API_KEY>

const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

const API_KEY = process.env.PIXELLAB_API_KEY;
if (!API_KEY) {
  console.error('Error: set PIXELLAB_API_KEY env variable before running.');
  process.exit(1);
}

const args = process.argv.slice(2);
const onlyName = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const force = args.includes('--force');

const PIXEL_DIR = path.join(__dirname, '..', 'assets', 'pixel');
const API_BASE = 'https://api.pixellab.ai';

// Consistent aesthetic applied to every character.
const PALETTE = 'dark gothic muted earth tones, bone white, deep shadow, amber highlights, minimal saturation';
const VIEW = 'high_top_down';
const OUTLINE = 'thin dark outline';
const SHADING = 'simple shading';
const DETAIL = 'medium';

// Character manifest — define every sprite we need.
// type: 'hero' = 56px 8-dir player | 'monster' = 4-frame strip | 'boss' = 4-frame strip
const CHARACTERS = [
  // ── Player ──────────────────────────────────────────────────────────────
  {
    name: 'player',
    size: 56,
    proportions: 'stylized',
    description: 'A tarnished warrior scribe in dark plate armor with worn leather wraps, holding a runed shortsword, cozy-gothic dark fantasy pixel art, top-down view',
    isAnchor: true,  // generated first, used as style reference for all others
  },

  // ── Common enemies ───────────────────────────────────────────────────────
  {
    name: 'hollow',
    size: 32,
    description: 'A gaunt hollow undead figure in torn robes, empty eye sockets glowing faint amber, tattered cloth, gothic dark fantasy pixel art, top-down view',
  },
  {
    name: 'hound',
    size: 32,
    description: 'A skeletal spectral hound with glowing eye sockets and trailing shadow fur, dark phantom creature, gothic pixel art, top-down view',
  },
  {
    name: 'knight',
    size: 40,
    description: 'A rusted armored knight with dented pauldrons and a cracked helmet visor, hollow soldier, dark gothic pixel art, top-down view',
  },
  {
    name: 'sentinel',
    size: 48,
    description: 'A heavy stone sentinel construct with glowing runic inscriptions, massive shield-bearer, guardian colossus, gothic pixel art, top-down view',
  },
  {
    name: 'sorcerer',
    size: 48,
    description: 'A robed sorcerer with skeletal hands and a floating tome, arcane runes orbiting the figure, dark mage, gothic pixel art, top-down view',
  },
  {
    name: 'phantom',
    size: 32,
    description: 'A translucent phantom wraith with trailing wisps, half-visible flickering form, ethereal ghost enemy, gothic pixel art, top-down view',
  },

  // ── Area 1 bosses ────────────────────────────────────────────────────────
  {
    name: 'sexton',
    size: 56,
    proportions: 'heroic',
    description: 'A corrupted church sexton in long dark vestments with a giant bronze bell-hammer, keeper of the parish graveyard, imposing boss figure, gothic pixel art, top-down view',
  },
  {
    name: 'mempool',
    size: 64,
    proportions: 'heroic',
    description: 'A massive spectral archivist wreathed in floating ledger pages and ink fog, transaction demon, corrupted bureaucrat boss, dark gothic pixel art, top-down view',
  },
  {
    name: 'tallow',
    size: 80,
    proportions: 'heroic',
    description: 'Mother Tallow — a grotesque wax-encrusted figure with melting candle appendages dripping wax, giant boss enemy in a chapel, horror gothic pixel art, top-down view',
  },

  // ── Area 2 bosses ────────────────────────────────────────────────────────
  {
    name: 'foreman',
    size: 64,
    proportions: 'heroic',
    description: 'A hulking debt-mine foreman with a pickaxe and iron manacles, scarred overseer boss, teal-green corrupted skin tone, gothic pixel art, top-down view',
  },
  {
    name: 'bifurcated',
    size: 56,
    proportions: 'stylized',
    description: 'A split dual-natured entity — one half amber Canon radiance, one half sickly green Schism shadow — bifurcated boss creature, gothic pixel art, top-down view',
  },
  {
    name: 'ledgerbound',
    size: 80,
    proportions: 'heroic',
    description: 'The Ledger-Bound — a towering figure chained to a massive stone ledger, pale blue ethereal glow, contested will made manifest, final vault boss, dark gothic pixel art, top-down view',
  },

  // ── Area 3 bosses ────────────────────────────────────────────────────────
  {
    name: 'scrivener',
    size: 64,
    proportions: 'stylized',
    description: 'A mad archive scrivener with ink-stained robes and a giant quill weapon, floating redacted pages, dark deep blue coloring, gothic pixel art, top-down view',
  },
  {
    name: 'cascade',
    size: 72,
    proportions: 'heroic',
    description: 'The Cascade — a crystalline entity of white and pale lavender shattering fragments, unstable record deletion boss, glowing shards orbiting body, gothic pixel art, top-down view',
  },
  {
    name: 'auditor',
    size: 80,
    proportions: 'heroic',
    description: 'The Auditor — a faceless bureaucrat in pristine white robes with a floating seal-stamp and reality-warping ledger, final boss, pale gold trim, dark gothic pixel art, top-down view',
  },

  // ── NPCs ─────────────────────────────────────────────────────────────────
  {
    name: 'hollow-ancestor',
    size: 24,
    description: 'A wise ancestor spirit in tattered burial shroud, ethereal amber glow, kindly NPC ghost guide, gothic pixel art, top-down view',
  },
  {
    name: 'relic-shade',
    size: 24,
    description: 'A spectral shade NPC in gossamer robes, canon amber radiance emanating, helpful spirit guide, gothic pixel art, top-down view',
  },
  {
    name: 'schism-shadow',
    size: 24,
    description: 'A Schism-tainted shadow figure in sickly green mist, mysterious NPC informant, corrupted record-keeper spirit, gothic pixel art, top-down view',
  },
  {
    name: 'canon-auditor',
    size: 24,
    description: 'A small canon auditor figure in pristine white miniature robes with a tiny stamp seal, benevolent bureaucrat NPC, gothic pixel art, top-down view',
  },
  {
    name: 'hollow-ancestor',
    size: 24,
    description: 'A wise ancestor spirit in tattered burial shroud, ethereal amber glow, kindly NPC ghost guide, gothic pixel art, top-down view',
  },
  {
    name: 'tallow-echo',
    size: 24,
    description: 'A small wax-dripping echo creature, remnant of Mother Tallow, melting candle form, gothic horror pixel art, top-down view',
  },
  {
    name: 'audit-wolf',
    size: 32,
    description: 'A spectral wolf with ledger-page fur markings and glowing audit-seal eyes, phantom hound creature, gothic pixel art, top-down view',
  },
];

// De-dupe by name (hollow-ancestor appeared twice in template)
const seen = new Set();
const CHAR_LIST = CHARACTERS.filter(c => {
  if (seen.has(c.name)) return false;
  seen.add(c.name);
  return true;
});

// ─────────────────────────────────────────────────────────────────────────────
// PNG encode/decode (zero-dependency, copied from scripts/lib/pixel-png.js logic)
// ─────────────────────────────────────────────────────────────────────────────

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(width, height, pixels) {
  const src = Buffer.isBuffer(pixels) ? pixels : Buffer.from(pixels.buffer, pixels.byteOffset || 0, width * height * 4);
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    src.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}
function decodePngBuffer(buf) {
  let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.slice(pos + 4, pos + 8).toString('ascii');
    const data = buf.slice(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  if (bitDepth !== 8 || colorType !== 6) throw new Error(`Expected 8-bit RGBA PNG (got depth=${bitDepth} colorType=${colorType})`);
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const pixels = new Uint8ClampedArray(width * height * 4);
  const stride = width * 4;
  let src = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = inflated[src++];
    const row = inflated.slice(src, src + stride); src += stride;
    const recon = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const bpp = 4, left = x >= bpp ? recon[x - bpp] : 0, up = prev[x] || 0, upLeft = x >= bpp ? prev[x - bpp] : 0;
      let v = row[x];
      if (filter === 1) v += left;
      else if (filter === 2) v += up;
      else if (filter === 3) v += Math.floor((left + up) / 2);
      else if (filter === 4) v += paeth(left, up, upLeft);
      recon[x] = v & 255;
    }
    recon.copy(Buffer.from(pixels.buffer), y * stride);
    prev = recon;
  }
  return { width, height, pixels };
}

// ─────────────────────────────────────────────────────────────────────────────
// Strip builder: 4 direction images → 1 horizontal strip
// Directions: south=idle, east=walk, west=attack, north=hurt
// ─────────────────────────────────────────────────────────────────────────────
function buildStrip(dirImages, frameSize) {
  // dirImages: { south, east, west, north } — each a Buffer (PNG)
  const DIRS = ['south', 'east', 'west', 'north'];
  const strip = new Uint8ClampedArray(frameSize * 4 * frameSize * 4);
  const fw = frameSize, fh = frameSize;
  DIRS.forEach((dir, col) => {
    const buf = dirImages[dir];
    if (!buf) { console.warn(`  Warning: missing direction '${dir}', leaving blank`); return; }
    const img = decodePngBuffer(buf);
    // Center-fit: scale to fill frame while preserving aspect ratio
    const scaleX = fw / img.width, scaleY = fh / img.height;
    const scale = Math.min(scaleX, scaleY, 1); // never upscale past 1:1
    const dw = Math.round(img.width * scale);
    const dh = Math.round(img.height * scale);
    const ox = col * fw + Math.floor((fw - dw) / 2);
    const oy = fh - dh - 1; // feet at bottom, 1px baseline
    // Nearest-neighbor blit
    for (let dy = 0; dy < dh; dy++) {
      const sy = Math.min(img.height - 1, Math.floor(dy / scale));
      for (let dx = 0; dx < dw; dx++) {
        const sx = Math.min(img.width - 1, Math.floor(dx / scale));
        const si = (sy * img.width + sx) * 4;
        if (img.pixels[si + 3] < 8) continue; // skip transparent
        const di = ((oy + dy) * (fw * 4) + (ox + dx)) * 4;
        strip[di] = img.pixels[si];
        strip[di + 1] = img.pixels[si + 1];
        strip[di + 2] = img.pixels[si + 2];
        strip[di + 3] = img.pixels[si + 3];
      }
    }
  });
  return strip;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP helper
// ─────────────────────────────────────────────────────────────────────────────
function post(endpoint, body) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body));
    const url = new URL(`/v2${endpoint}`, API_BASE);
    const options = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': payload.length,
      },
    };
    const req = https.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 300)}`));
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error(`JSON parse error: ${raw.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Manifest update
// ─────────────────────────────────────────────────────────────────────────────
function recordManifest(entry) {
  const file = path.join(PIXEL_DIR, 'manifest.json');
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { manifest = {}; }
  manifest[entry.name] = entry;
  const sorted = {};
  for (const k of Object.keys(manifest).sort()) sorted[k] = manifest[k];
  fs.writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate one character
// ─────────────────────────────────────────────────────────────────────────────
async function generateCharacter(char, anchorBase64) {
  const outFile = path.join(PIXEL_DIR, `${char.name}.png`);

  // Skip if exists and not a placeholder (unless --force)
  if (!force && fs.existsSync(outFile)) {
    const manifestFile = path.join(PIXEL_DIR, 'manifest.json');
    let manifest = {};
    try { manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch (_) {}
    const entry = manifest[char.name];
    if (!entry || !entry.placeholder) {
      console.log(`  skip ${char.name} (exists, not placeholder)`);
      // If this is the anchor, load its south image for downstream use
      if (char.isAnchor) return loadAnchorFromDisk(char);
      return null;
    }
  }

  console.log(`  → generating ${char.name} (${char.size}px)...`);

  const requestBody = {
    description: char.description,
    image_size: { width: char.size, height: char.size },
    view: VIEW,
    outline: OUTLINE,
    shading: SHADING,
    detail: DETAIL,
    color_palette: PALETTE,
    no_background: true,
  };
  if (char.proportions) requestBody.proportions = { type: 'preset', name: char.proportions };
  if (anchorBase64 && !char.isAnchor) {
    // Pass the player's south image as style reference
    requestBody.directions = { south: { base64: anchorBase64 } };
  }

  let response;
  try {
    response = await post('/create-character-with-4-directions', requestBody);
  } catch (err) {
    console.error(`  ✗ API error for ${char.name}: ${err.message}`);
    return null;
  }

  if (!response.images) {
    console.error(`  ✗ No images in response for ${char.name}: ${JSON.stringify(response).slice(0, 200)}`);
    return null;
  }

  // Decode base64 → Buffer for each direction
  const dirBuffers = {};
  for (const dir of ['south', 'east', 'west', 'north']) {
    const entry = response.images[dir];
    if (!entry) { console.warn(`  missing direction ${dir} in response`); continue; }
    // Strip data: URI prefix if present
    const b64 = (entry.base64 || entry).replace(/^data:image\/\w+;base64,/, '');
    dirBuffers[dir] = Buffer.from(b64, 'base64');
  }

  // Build and save the strip
  const strip = buildStrip(dirBuffers, char.size);
  const stripPng = encodePng(char.size * 4, char.size, strip);
  fs.mkdirSync(PIXEL_DIR, { recursive: true });
  fs.writeFileSync(outFile, stripPng);

  // Update manifest
  recordManifest({
    name: char.name,
    type: 'strip',
    layout: 'row',
    frameW: char.size,
    frameH: char.size,
    file: `${char.name}.png`,
    frames: ['idle', 'walk', 'attack', 'hurt'],
    source: 'pixellab-api',
  });

  console.log(`  ✓ ${char.name}.png (${char.size * 4}x${char.size})`);

  // Return south base64 if this is the anchor character
  if (char.isAnchor && dirBuffers.south) {
    return dirBuffers.south.toString('base64');
  }
  return null;
}

// If the anchor file already exists (resuming), extract the south frame from the strip
// as a fake "base64" for subsequent API calls.
// We can't actually reconstruct the PixelLab quality from the strip, so we
// just return the existing strip's first frame as a PNG for palette reference.
function loadAnchorFromDisk(char) {
  const outFile = path.join(PIXEL_DIR, `${char.name}.png`);
  try {
    const buf = fs.readFileSync(outFile);
    const img = decodePngBuffer(buf);
    // Extract first frame (south / idle) = left char.size pixels
    const fw = char.size, fh = char.size;
    const frame = new Uint8ClampedArray(fw * fh * 4);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const si = (y * img.width + x) * 4;
        const di = (y * fw + x) * 4;
        frame[di] = img.pixels[si];
        frame[di + 1] = img.pixels[si + 1];
        frame[di + 2] = img.pixels[si + 2];
        frame[di + 3] = img.pixels[si + 3];
      }
    }
    const framePng = encodePng(fw, fh, frame);
    console.log(`  anchor loaded from ${char.name}.png (south frame)`);
    return framePng.toString('base64');
  } catch (err) {
    console.warn(`  could not load anchor from disk: ${err.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('RUNECHAIN PixelLab asset generator');
  console.log(`Output: ${PIXEL_DIR}`);
  if (onlyName) console.log(`Filter: --only ${onlyName}`);
  if (force) console.log('Mode: --force (regenerate all)');
  console.log('');

  const list = onlyName ? CHAR_LIST.filter(c => c.name === onlyName) : CHAR_LIST;
  if (!list.length) { console.error(`No characters match --only ${onlyName}`); process.exit(1); }

  // Ensure anchor (player) is always generated first
  const anchor = CHAR_LIST.find(c => c.isAnchor);
  let anchorBase64 = null;

  if (!onlyName && anchor) {
    anchorBase64 = await generateCharacter(anchor, null);
  }

  // Generate remaining characters
  for (const char of list) {
    if (char.isAnchor) continue; // already done above
    await generateCharacter(char, anchorBase64);
    // Small pause between API calls to avoid rate limiting
    await new Promise(r => setTimeout(r, 400));
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
