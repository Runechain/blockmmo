'use strict';
// Zero-dependency 8-bit RGBA PNG codec + small image helpers.
// Extracted from import_pixellab_character.js / generate_pixel_assets.js so the
// asset pipeline shares one implementation. No npm install, ever.
const fs = require('fs');
const zlib = require('zlib');

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

// Encode an 8-bit RGBA buffer/Uint8ClampedArray (length w*h*4) into a PNG Buffer.
function encodePng(width, height, pixels) {
  const src = Buffer.from(pixels.buffer, pixels.byteOffset || 0, width * height * 4);
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    src.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

// Decode an 8-bit RGBA PNG file into { width, height, pixels:Uint8ClampedArray }.
function decodePng(file) {
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
    else if (type === 'IEND') break;
  }
  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`Expected an 8-bit RGBA PNG (export with alpha): ${file}`);
  }
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

// A blank transparent RGBA image.
function newImage(width, height) {
  return { width, height, pixels: new Uint8ClampedArray(width * height * 4) };
}

function color(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

// Tight bounding box of pixels above an alpha threshold, expanded by `margin`.
function alphaBounds(img, { threshold = 12, margin = 0, region = null } = {}) {
  const rx = region ? region.x : 0;
  const ry = region ? region.y : 0;
  const rw = region ? region.w : img.width;
  const rh = region ? region.h : img.height;
  let minX = rx + rw, minY = ry + rh, maxX = -1, maxY = -1;
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      if (img.pixels[(y * img.width + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return { x: rx, y: ry, w: rw, h: rh };
  minX = Math.max(rx, minX - margin);
  minY = Math.max(ry, minY - margin);
  maxX = Math.min(rx + rw - 1, maxX + margin);
  maxY = Math.min(ry + rh - 1, maxY + margin);
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// Uniform scale that fits `bounds` inside maxW x maxH (never upscales past `maxUp`).
function fitScale(bounds, maxW, maxH, maxUp = Infinity) {
  return Math.min(maxW / bounds.w, maxH / bounds.h, maxUp);
}

// Nearest-neighbor copy of src[bounds] into dst at (dx0, dy0), scaled to w x h.
function blitInto(src, bounds, dst, dstWidth, dx0, dy0, w, h) {
  const scaleX = w / bounds.w, scaleY = h / bounds.h;
  for (let y = 0; y < h; y++) {
    const sy = bounds.y + Math.min(bounds.h - 1, Math.floor(y / scaleY));
    for (let x = 0; x < w; x++) {
      const sx = bounds.x + Math.min(bounds.w - 1, Math.floor(x / scaleX));
      const si = (sy * src.width + sx) * 4;
      const di = ((dy0 + y) * dstWidth + dx0 + x) * 4;
      if (src.pixels[si + 3] === 0) continue; // keep dst transparent under transparent source
      dst.pixels[di] = src.pixels[si];
      dst.pixels[di + 1] = src.pixels[si + 1];
      dst.pixels[di + 2] = src.pixels[si + 2];
      dst.pixels[di + 3] = src.pixels[si + 3];
    }
  }
}

function writeImage(img, file) {
  fs.writeFileSync(file, encodePng(img.width, img.height, img.pixels));
}

module.exports = {
  encodePng, decodePng, newImage, color,
  alphaBounds, fitScale, blitInto, writeImage,
};
