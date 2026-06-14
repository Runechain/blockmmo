const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const defaultSource = path.join(
  process.env.HOME || '',
  'Downloads',
  'A_tarnished_warrior_standing_in (1)',
  'A_tarnished_warrior_standing_in',
  'rotations'
);
const outDir = path.join(__dirname, '..', 'assets', 'pixel');
const outPath = path.join(outDir, 'player-directions.png');
const metaPath = path.join(outDir, 'player-directions.json');
const directions = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const srcDir = args.get('--src') || defaultSource;
const frameSize = Number(args.get('--frame') || 56);

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

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function writePng(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    Buffer.from(pixels.buffer, y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function readPng(file) {
  const buf = fs.readFileSync(file);
  let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.slice(pos + 4, pos + 8).toString('ascii');
    const data = buf.slice(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
  }
  if (bitDepth !== 8 || colorType !== 6) throw new Error(`Expected 8-bit RGBA PNG: ${file}`);
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const pixels = new Uint8ClampedArray(width * height * 4);
  const bpp = 4, stride = width * bpp;
  let src = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = inflated[src++];
    const row = inflated.slice(src, src + stride);
    src += stride;
    const recon = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? recon[x - bpp] : 0;
      const up = prev[x] || 0;
      const upLeft = x >= bpp ? prev[x - bpp] : 0;
      let v = row[x];
      if (filter === 1) v += left;
      else if (filter === 2) v += up;
      else if (filter === 3) v += Math.floor((left + up) / 2);
      else if (filter === 4) v += paeth(left, up, upLeft);
      else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}: ${file}`);
      recon[x] = v & 255;
    }
    recon.copy(Buffer.from(pixels.buffer), y * stride);
    prev = recon;
  }
  return { width, height, pixels };
}

function alphaBounds(img) {
  let minX = img.width, minY = img.height, maxX = -1, maxY = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.pixels[(y * img.width + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return { x: 0, y: 0, w: img.width, h: img.height };
  const margin = 5;
  minX = Math.max(0, minX - margin);
  minY = Math.max(0, minY - margin);
  maxX = Math.min(img.width - 1, maxX + margin);
  maxY = Math.min(img.height - 1, maxY + margin);
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function blitScaled(src, bounds, dst, frameIndex) {
  const maxW = frameSize - 8, maxH = frameSize - 6;
  const scale = Math.min(maxW / bounds.w, maxH / bounds.h);
  const w = Math.max(1, Math.round(bounds.w * scale));
  const h = Math.max(1, Math.round(bounds.h * scale));
  const dx0 = frameIndex * frameSize + Math.floor((frameSize - w) / 2);
  const dy0 = frameSize - h - 3;
  for (let y = 0; y < h; y++) {
    const sy = bounds.y + Math.min(bounds.h - 1, Math.floor(y / scale));
    for (let x = 0; x < w; x++) {
      const sx = bounds.x + Math.min(bounds.w - 1, Math.floor(x / scale));
      const si = (sy * src.width + sx) * 4;
      const di = ((dy0 + y) * frameSize * directions.length + dx0 + x) * 4;
      dst[di] = src.pixels[si];
      dst[di + 1] = src.pixels[si + 1];
      dst[di + 2] = src.pixels[si + 2];
      dst[di + 3] = src.pixels[si + 3];
    }
  }
  return { bounds, scaled: { w, h, x: dx0 - frameIndex * frameSize, y: dy0 } };
}

fs.mkdirSync(outDir, { recursive: true });
const sheet = new Uint8ClampedArray(frameSize * directions.length * frameSize * 4);
const meta = { source: srcDir, frameSize, directions: {}, generatedAt: new Date().toISOString() };

directions.forEach((dir, index) => {
  const file = path.join(srcDir, `${dir}.png`);
  if (!fs.existsSync(file)) throw new Error(`Missing PixelLab rotation: ${file}`);
  const img = readPng(file);
  meta.directions[dir] = blitScaled(img, alphaBounds(img), sheet, index);
});

fs.writeFileSync(outPath, writePng(frameSize * directions.length, frameSize, sheet));
fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
console.log(`Imported PixelLab character sheet: ${outPath}`);
