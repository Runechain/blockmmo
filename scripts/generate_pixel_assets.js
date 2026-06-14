const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const outDir = path.join(__dirname, '..', 'assets', 'pixel');
fs.mkdirSync(outDir, { recursive: true });

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

function png(width, height, pixels) {
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

function color(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

function sheet(name, frameW, frameH, drawFrame) {
  const frames = 4;
  const w = frameW * frames;
  const h = frameH;
  const px = new Uint8ClampedArray(w * h * 4);
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = c[3];
  };
  const rect = (f, x, y, rw, rh, hex) => {
    const c = color(hex);
    const ox = f * frameW;
    for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) set(ox + xx, yy, c);
  };
  for (let f = 0; f < frames; f++) drawFrame(f, rect);
  fs.writeFileSync(path.join(outDir, `${name}.png`), png(w, h, px));
}

function atlas(name, tileW, tileH, cols, rows, drawTile) {
  const w = tileW * cols;
  const h = tileH * rows;
  const px = new Uint8ClampedArray(w * h * 4);
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = c[3];
  };
  const rect = (id, x, y, rw, rh, hex) => {
    const c = color(hex);
    const ox = (id % cols) * tileW;
    const oy = Math.floor(id / cols) * tileH;
    for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) set(ox + xx, oy + yy, c);
  };
  const pix = (id, x, y, hex) => rect(id, x, y, 1, 1, hex);
  for (let id = 0; id < cols * rows; id++) drawTile(id, rect, pix);
  fs.writeFileSync(path.join(outDir, `${name}.png`), png(w, h, px));
}

const TILE = {
  grass: 0,
  grassDark: 1,
  grassFlower: 2,
  cobble: 3,
  cobbleEdge: 4,
  dirt: 5,
  dirtEdge: 6,
  plaza: 7,
  plazaCrack: 8,
  cursed: 9,
  graveDirt: 10,
  shadowGrass: 11,
  water: 12,
  sand: 13,
  chapelWall: 14,
  chapelRoof: 15,
  bramble: 16,
  fenceGround: 17,
  mossStone: 18,
  black: 19
};

atlas('tiles', 16, 16, 8, 3, (id, r, p) => {
  const fill = hex => r(id, 0, 0, 16, 16, hex);
  switch (id) {
    case TILE.grass:
      fill('#319347');
      for (const [x, y, c] of [[2,3,'#68be5f'],[7,5,'#236f32'],[12,2,'#58b854'],[4,10,'#2c843b'],[10,12,'#5fbb55'],[14,8,'#287f39']]) p(id, x, y, c);
      break;
    case TILE.grassDark:
      fill('#236d38');
      for (const [x, y] of [[3,4],[8,2],[13,9],[5,12],[11,13]]) p(id, x, y, '#358f4d');
      break;
    case TILE.grassFlower:
      fill('#309247');
      for (const [x, y] of [[2,2],[5,10],[11,6]]) p(id, x, y, '#66be62');
      p(id, 8, 4, '#f1c3ff'); p(id, 9, 4, '#ffd9ff');
      break;
    case TILE.cobble:
      fill('#7d7661');
      for (let y = 1; y < 16; y += 5) r(id, 0, y, 16, 1, '#4d493e');
      for (let x = 2; x < 16; x += 6) r(id, x, 0, 1, 5, '#4d493e');
      for (let x = 5; x < 16; x += 6) r(id, x, 6, 1, 5, '#4d493e');
      r(id, 1, 2, 5, 1, '#aaa188'); r(id, 9, 7, 4, 1, '#aaa188'); r(id, 3, 13, 7, 1, '#5a5548');
      break;
    case TILE.cobbleEdge:
      fill('#2c6236');
      r(id, 0, 5, 16, 11, '#766f5b'); r(id, 0, 5, 16, 2, '#4d493e');
      r(id, 1, 8, 6, 1, '#aaa188'); r(id, 9, 12, 5, 1, '#514c40');
      break;
    case TILE.dirt:
      fill('#c99a43');
      r(id, 0, 0, 16, 2, '#dcb05c'); r(id, 0, 14, 16, 2, '#8d622d');
      for (const [x, y] of [[3,4],[10,3],[6,9],[13,11],[2,13]]) r(id, x, y, 3, 1, '#a77835');
      break;
    case TILE.dirtEdge:
      fill('#309247');
      r(id, 0, 5, 16, 11, '#c99a43'); r(id, 0, 5, 16, 2, '#8d622d');
      r(id, 2, 3, 3, 2, '#66be62'); r(id, 10, 4, 2, 2, '#247839');
      break;
    case TILE.plaza:
      fill('#696b63');
      r(id, 0, 0, 16, 2, '#8b8c7d'); r(id, 0, 14, 16, 2, '#41443f');
      r(id, 1, 4, 6, 1, '#8e8f80'); r(id, 9, 9, 5, 1, '#464942'); r(id, 7, 1, 1, 15, '#4e514b');
      break;
    case TILE.plazaCrack:
      fill('#5f625c');
      r(id, 0, 0, 16, 2, '#808177'); r(id, 8, 1, 1, 6, '#303331'); r(id, 9, 7, 1, 4, '#303331'); r(id, 6, 10, 3, 1, '#303331');
      break;
    case TILE.cursed:
      fill('#241820');
      r(id, 0, 0, 16, 2, '#34202b'); r(id, 0, 14, 16, 2, '#120d12');
      for (const [x, y] of [[2,5],[5,11],[11,3],[13,9]]) r(id, x, y, 4, 2, '#5d2639');
      p(id, 8, 8, '#9b2b4a'); p(id, 9, 8, '#9b2b4a');
      break;
    case TILE.graveDirt:
      fill('#5f533f');
      r(id, 0, 0, 16, 2, '#7b6b50'); r(id, 0, 14, 16, 2, '#332b22');
      r(id, 3, 5, 10, 2, '#8a7857'); r(id, 4, 10, 7, 1, '#302820');
      break;
    case TILE.shadowGrass:
      fill('#1d5630');
      for (const [x, y] of [[4,4],[9,7],[13,12]]) p(id, x, y, '#2d8045');
      break;
    case TILE.water:
      fill('#3787a5');
      r(id, 0, 0, 16, 3, '#62b8ca'); r(id, 0, 13, 16, 3, '#1f5f82');
      r(id, 2, 5, 6, 1, '#9ad7de'); r(id, 10, 10, 5, 1, '#8fced9');
      break;
    case TILE.sand:
      fill('#c88d35');
      r(id, 0, 0, 16, 2, '#e0b25a'); r(id, 0, 14, 16, 2, '#855321');
      p(id, 2, 7, '#f0c56a'); p(id, 9, 11, '#9b682b');
      break;
    case TILE.chapelWall:
      fill('#c8ac86');
      for (let y = 3; y < 16; y += 4) r(id, 0, y, 16, 1, '#7e5a44');
      r(id, 0, 0, 2, 16, '#7e5a44'); r(id, 14, 0, 2, 16, '#6b4534'); r(id, 2, 1, 12, 1, '#f1d5ad');
      break;
    case TILE.chapelRoof:
      fill('#8f2f2a');
      for (let x = 0; x < 16; x += 4) r(id, x, 0, 2, 16, '#b24a39');
      r(id, 0, 0, 16, 2, '#d66d4b'); r(id, 0, 14, 16, 2, '#5c1d22');
      break;
    case TILE.bramble:
      fill('#271622');
      r(id, 2, 6, 12, 2, '#542534'); r(id, 7, 1, 2, 14, '#3d1d29'); r(id, 10, 4, 4, 4, '#8a263d');
      break;
    case TILE.fenceGround:
      fill('#319347');
      r(id, 0, 8, 16, 3, '#8a5a2d'); r(id, 3, 3, 3, 12, '#6b431f'); r(id, 11, 3, 3, 12, '#6b431f');
      break;
    case TILE.mossStone:
      fill('#59615a');
      r(id, 0, 0, 16, 2, '#868a78'); r(id, 0, 14, 16, 2, '#343936'); r(id, 1, 3, 8, 2, '#4d7d42'); r(id, 9, 9, 5, 2, '#375d34');
      break;
    case TILE.black:
      fill('#090b0f');
      break;
    default:
      fill('#ff00ff');
  }
});

sheet('player', 24, 24, (f, r) => {
  const bob = f === 1 ? 1 : 0;
  r(f, 9, 4 + bob, 6, 6, '#cfa982');
  r(f, 7, 10 + bob, 10, 10, '#334052');
  r(f, 6, 11 + bob, 2, 8, '#8ca0b8');
  r(f, 16, 11 + bob, 2, 8, '#8ca0b8');
  r(f, 9, 20, 2, 4, '#11151a');
  r(f, 14, 20, 2, 4, '#11151a');
  r(f, 10, 7 + bob, 1, 1, '#090b0f');
  r(f, 14, 7 + bob, 1, 1, '#090b0f');
  if (f === 2) r(f, 15, 7, 8, 3, '#dce8ef');
  else r(f, 18, 7, 2, 13, '#dce8ef');
  if (f === 3) r(f, 5, 5, 14, 17, '#e24a4a');
});

sheet('phantom', 24, 24, (f, r) => {
  const bob = f === 1 ? 1 : 0;
  r(f, 8, 5 + bob, 8, 6, '#8ca0ff');
  r(f, 7, 11 + bob, 10, 9, '#273b50');
  r(f, 6, 19, 12, 3, '#79f2ff');
});

sheet('hollow', 24, 24, (f, r) => {
  const bob = f === 1 ? 1 : 0;
  r(f, 7, 8 + bob, 10, 12, '#3a1115');
  r(f, 8, 3 + bob, 8, 7, '#e24a4a');
  r(f, 10, 5 + bob, 1, 2, '#090b0f');
  r(f, 14, 5 + bob, 1, 2, '#090b0f');
  r(f, 5, 12 + bob, 3, 8, '#2a0b0e');
  r(f, 16, 12 + bob, 3, 8, '#2a0b0e');
  if (f === 2) r(f, 13, 8, 9, 3, '#f1c75b');
  if (f === 3) r(f, 5, 5, 14, 15, '#ff8a8a');
});

sheet('hound', 24, 24, (f, r) => {
  const step = f === 1 ? 1 : 0;
  r(f, 4, 10, 14, 7, '#f26b2f');
  r(f, 15, 7, 6, 6, '#ffad4d');
  r(f, 18, 9, 2, 2, '#090b0f');
  r(f, 2, 12, 4, 3, '#7c2d1d');
  r(f, 5, 17 - step, 3, 5, '#24110d');
  r(f, 14, 17 + step, 3, 5, '#24110d');
  r(f, 20, 13, 3, 2, '#f1c75b');
  if (f === 3) r(f, 3, 8, 18, 12, '#ff8a54');
});

sheet('knight', 24, 24, (f, r) => {
  const bob = f === 1 ? 1 : 0;
  r(f, 8, 4 + bob, 8, 7, '#b9c2cf');
  r(f, 7, 10 + bob, 10, 11, '#48515a');
  r(f, 6, 11 + bob, 2, 9, '#b9c2cf');
  r(f, 16, 11 + bob, 2, 9, '#b9c2cf');
  r(f, 10, 7 + bob, 4, 2, '#090b0f');
  r(f, 18, 8, 2, 13, '#dce8ef');
  if (f === 2) r(f, 13, 9, 10, 3, '#dce8ef');
  if (f === 3) r(f, 6, 5, 13, 16, '#e24a4a');
});

sheet('sorcerer', 24, 24, (f, r) => {
  const bob = f === 1 ? 1 : 0;
  r(f, 8, 5 + bob, 8, 7, '#9b74ff');
  r(f, 7, 11 + bob, 10, 10, '#2a1748');
  r(f, 10, 8 + bob, 1, 1, '#e7d8ff');
  r(f, 14, 8 + bob, 1, 1, '#e7d8ff');
  r(f, 18, 7, 2, 14, '#6d5328');
  r(f, 17, 5, 4, 4, '#c89bff');
  if (f === 2) r(f, 4, 10, 10, 4, '#9b74ff');
  if (f === 3) r(f, 6, 6, 13, 15, '#ff8aef');
});

sheet('sentinel', 48, 48, (f, r) => {
  const bob = f === 1 ? 1 : 0;
  r(f, 10, 27, 28, 9, '#7d6221');
  r(f, 8, 34, 5, 8, '#2a1d0d');
  r(f, 32, 34, 5, 8, '#2a1d0d');
  r(f, 18, 10 + bob, 12, 12, '#f1c75b');
  r(f, 16, 21 + bob, 16, 16, '#9b7a2b');
  r(f, 14, 22 + bob, 4, 14, '#f1c75b');
  r(f, 30, 22 + bob, 4, 14, '#f1c75b');
  r(f, 22, 15 + bob, 4, 2, '#090b0f');
  r(f, 36, 13, 4, 28, '#9b2b21');
  r(f, 39, 12, 5, 8, '#f1c75b');
  if (f === 2) r(f, 29, 18, 18, 5, '#f1c75b');
  if (f === 3) r(f, 12, 12, 26, 28, '#ffd78a');
});

console.log(`Generated pixel assets in ${outDir}`);
