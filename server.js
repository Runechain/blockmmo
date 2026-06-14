/* ============================================================================
   RUNECHAIN — authoritative realm server (MMO relay)
   Zero dependencies. Pure Node: serves the client over HTTP and runs a
   hand-rolled WebSocket server on the SAME port (8080).

       node server.js
       open http://localhost:8080  (in two+ browser tabs / machines)

   It relays player transforms and gossips mined blockchain blocks so every
   connected Tarnished shares one world and one ledger.
   ========================================================================== */
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'; // WebSocket magic string

/* ---- HTTP: serve the game client -------------------------------------- */
const server = http.createServer((req, res) => {
  // health check for AWS load balancers / App Runner
  if (req.url === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  let file = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const full = path.join(__dirname, path.normalize(file).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    const ext = path.extname(full);
    const type = ext === '.html' ? 'text/html'
               : ext === '.js'   ? 'text/javascript'
               : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

/* ---- WebSocket: handshake + framing (RFC 6455, no deps) ---------------- */
const clients = new Set();           // each: { socket, id, name, last }

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
  const client = { socket, id: null, name: 'Tarnished', last: {} };
  clients.add(client);

  let buffer = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    let frame;
    while ((frame = decodeFrame(buffer))) {
      buffer = frame.rest;
      if (frame.opcode === 0x8) { socket.end(); return; }      // close
      if (frame.opcode === 0x9) { socket.write(encodeFrame(frame.payload, 0xA)); continue; } // ping->pong
      if (frame.opcode === 0x1 && frame.payload != null) handleMessage(client, frame.payload.toString('utf8'));
    }
  });
  socket.on('close', () => dropClient(client));
  socket.on('error', () => dropClient(client));
});

function dropClient(client) {
  if (!clients.has(client)) return;
  clients.delete(client);
  if (client.id) broadcast({ t: 'leave', id: client.id }, client);
  console.log(`✦ ${client.name} left the realm  (${clients.size} online)`);
}

function handleMessage(client, raw) {
  let m; try { m = JSON.parse(raw); } catch (_) { return; }
  switch (m.t) {
    case 'join':
      client.id = m.id; client.name = (m.name || 'Tarnished').slice(0, 14);
      console.log(`✦ ${client.name} entered the realm  (${clients.size} online)`);
      // adopt the newcomer's ledger if it's longer (longest-chain convergence), then sync them
      if (Array.isArray(m.chain) && m.chain.length > masterChain.length) { masterChain = m.chain; saveLedger(); }
      send(client, { t: 'chain', chain: masterChain });
      break;
    case 'state':
      client.last = m;
      broadcast(m, client);                 // relay transform to everyone else
      break;
    case 'block':
      acceptBlock(m.block);
      broadcast(m, client);                  // gossip the mined block
      break;
  }
}

/* ---- shared ledger (longest-valid-chain authority) + disk persistence -- */
const LEDGER_FILE = path.join(__dirname, 'ledger.json');
let masterChain = loadLedger();
let saveTimer = null;

function loadLedger() {
  try {
    const data = JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
    if (Array.isArray(data)) { console.log(`⛓ ledger restored from disk — ${data.length} block(s)`); return data; }
  } catch (_) { /* no ledger yet — start a fresh realm */ }
  return [];
}
// debounced write: a burst of gossiped blocks collapses into one disk write
function saveLedger() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    fs.writeFile(LEDGER_FILE, JSON.stringify(masterChain), (err) => {
      if (err) console.error('⚠ ledger save failed:', err.message);
    });
  }, 800);
}

function acceptBlock(block) {
  // trust client validation for this demo; keep the heaviest chain we've seen
  if (block && typeof block.index === 'number' && block.index >= masterChain.length) {
    masterChain[block.index] = block;
    console.log(`⛓ block #${block.index} gossiped — ${block.txs ? block.txs.length : 0} tx`);
    saveLedger();
  }
}

function broadcast(obj, except) {
  const data = encodeFrame(Buffer.from(JSON.stringify(obj)), 0x1);
  for (const c of clients) if (c !== except && c.socket.writable) c.socket.write(data);
}
function send(client, obj) {
  if (client.socket.writable) client.socket.write(encodeFrame(Buffer.from(JSON.stringify(obj)), 0x1));
}

/* ---- minimal RFC6455 frame codec -------------------------------------- */
function decodeFrame(buf) {
  if (buf.length < 2) return null;
  const fin = buf[0] & 0x80, opcode = buf[0] & 0x0f;
  const masked = buf[1] & 0x80;
  let len = buf[1] & 0x7f, offset = 2;
  if (len === 126) { if (buf.length < 4) return null; len = buf.readUInt16BE(2); offset = 4; }
  else if (len === 127) { if (buf.length < 10) return null; len = Number(buf.readBigUInt64BE(2)); offset = 10; }
  let mask;
  if (masked) { if (buf.length < offset + 4) return null; mask = buf.slice(offset, offset + 4); offset += 4; }
  if (buf.length < offset + len) return null;
  let payload = buf.slice(offset, offset + len);
  if (masked) { const out = Buffer.alloc(len); for (let i = 0; i < len; i++) out[i] = payload[i] ^ mask[i % 4]; payload = out; }
  return { fin, opcode, payload, rest: buf.slice(offset + len) };
}
function encodeFrame(payload, opcode = 0x1) {
  const len = payload.length;
  let header;
  if (len < 126) { header = Buffer.alloc(2); header[1] = len; }
  else if (len < 65536) { header = Buffer.alloc(4); header[1] = 126; header.writeUInt16BE(len, 2); }
  else { header = Buffer.alloc(10); header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2); }
  header[0] = 0x80 | opcode;           // FIN + opcode (server frames unmasked)
  return Buffer.concat([header, payload]);
}

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║   RUNECHAIN realm server is live             ║');
  console.log(`  ║   → http://localhost:${PORT}                     ║`);
  console.log('  ║   Open in 2+ tabs to see real multiplayer    ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
});
