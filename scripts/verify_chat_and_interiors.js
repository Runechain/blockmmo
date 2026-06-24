// Verifies the proximity-chat relay (server) and the walk-in interior model (content + client wiring).
// Server side exercises the real createRealmServer; client/content sides are static-source assertions
// in the same spirit as verify_presence_modes.js (the browser DOM can't run here).
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const serverApi = require(path.join(root, 'server.js'));
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const Content = require(path.join(root, 'game', 'content.js'));

/* ----------------------------- test harness ----------------------------- */
function makeClient(id) {
  return { id, name: id, socket: { writable: true, writes: [], write(f){ this.writes.push(f); }, end(){} }, last: {} };
}
function readMessages(client) {
  const frames = client.socket.writes.splice(0);
  const messages = []; let buffer = Buffer.concat(frames);
  while (buffer.length) { const frame = serverApi.decodeFrame(buffer); assert(frame, 'expected complete frame'); messages.push(JSON.parse(frame.payload.toString('utf8'))); buffer = frame.rest; }
  return messages;
}
function base64url(buf){ return Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,''); }
function makeCredential(){
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return { publicKey: publicKey.export({ format: 'jwk' }),
    sign(m){ return base64url(crypto.sign('sha256', Buffer.from(m), { key: privateKey, dsaEncoding: 'ieee-p1363' })); } };
}
function authenticate(realm, client, credential, { peerId = client.id, name = 'Recorded' } = {}) {
  const ch = realm.handleParsedMessage(client, { t:'account:challenge', credential:{ type:'browser-p256-v1', publicKey:credential.publicKey } });
  assert.strictEqual(ch.ok, true);
  const challenge = readMessages(client)[0];
  const join = realm.handleParsedMessage(client, { t:'join', id:peerId, name, credential:{ type:'browser-p256-v1', publicKey:credential.publicKey, challengeId:challenge.challengeId, signature:credential.sign(challenge.message) } });
  assert.strictEqual(join.ok, true);
  return readMessages(client)[0]; // 'account'
}

/* ----------------------------- server: chat relay ----------------------- */
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-interiors-'));
let nowMs = 1000;
const realm = serverApi.createRealmServer({
  ledgerFile: path.join(tempDir, 'ledger.json'),
  accountsFile: path.join(tempDir, 'accounts.json'),
  seasonId: 'season-one', difficulty: 1, now: () => nowMs, saveDelayMs: 0, quiet: true,
});

const speaker = makeClient('speaker');
const listener = makeClient('listener');
realm.addClient(speaker); realm.addClient(listener);

// Unauthenticated chat is rejected (account required).
const strayChat = realm.handleParsedMessage(speaker, { t:'chat', text:'hello' });
assert.strictEqual(strayChat.ok, false, 'chat before join should be rejected');
readMessages(speaker); // drain the account_required error frame before authenticating

const speakerAcct = authenticate(realm, speaker, makeCredential(), { peerId:'speaker', name:'Caller' });
authenticate(realm, listener, makeCredential(), { peerId:'listener', name:'Hearer' });
readMessages(speaker); readMessages(listener); // drain join/account noise

// Empty/whitespace chat is rejected and not relayed.
const empty = realm.handleParsedMessage(speaker, { t:'chat', text:'   ' });
assert.strictEqual(empty.ok, false, 'empty chat should be rejected');
assert.strictEqual(readMessages(listener).length, 0, 'empty chat should not be relayed');

// A real chat relays to peers with server-stamped identity (never client-spoofable).
const ok = realm.handleParsedMessage(speaker, { t:'chat', text:'well met, Recorded', interior:'tavern', name:'SPOOFED', id:'SPOOFED' });
assert.strictEqual(ok.ok, true, 'valid chat should be accepted');
const heard = readMessages(listener);
assert.strictEqual(heard.length, 1, 'peer should receive exactly one chat frame');
assert.deepStrictEqual(heard[0], { t:'chat', id: speakerAcct.peerId, name:'Caller', text:'well met, Recorded', interior:'tavern' },
  'chat should carry server identity + interior, ignoring client-supplied id/name');

// The sender does not receive an echo (the client echoes locally).
assert.strictEqual(readMessages(speaker).length, 0, 'sender should not be echoed their own chat');

// Overlong chat is clamped to 160 chars.
const longText = 'x'.repeat(400);
realm.handleParsedMessage(speaker, { t:'chat', text: longText });
const clamped = readMessages(listener)[0];
assert.strictEqual(clamped.text.length, 160, 'chat text should be clamped to 160 chars');
assert.strictEqual(clamped.interior, null, 'chat without an interior should relay interior:null');

console.log('  ok  chat relay: auth-gated, server-stamped, clamped, no self-echo');

/* ----------------------------- content: interiors ----------------------- */
const INTERIORS = Content.INTERIORS;
assert(Array.isArray(INTERIORS) && INTERIORS.length >= 3, 'content should export an INTERIORS array (>=3 buildings)');

const ids = new Set();
let withNpc = 0, secretRewards = 0;
for (const it of INTERIORS) {
  assert(it.id && !ids.has(it.id), 'each interior needs a unique id: ' + it.id); ids.add(it.id);
  assert(it.name, 'interior needs a name: ' + it.id);
  assert(it.building && it.building.door && Number.isFinite(it.building.door.x) && Number.isFinite(it.building.door.y),
    'interior needs an overworld building door: ' + it.id);
  assert(it.w > 0 && it.h > 0, 'interior needs positive bounds: ' + it.id);
  for (const p of [it.spawn, it.exit]) {
    assert(p && Number.isFinite(p.x) && Number.isFinite(p.y), 'interior needs spawn+exit points: ' + it.id);
    assert(p.x >= 0 && p.x <= it.w && p.y >= 0 && p.y <= it.h, 'spawn/exit must be inside bounds: ' + it.id);
  }
  // You must always be able to leave: spawn and exit shouldn't coincide (else you'd exit on entry).
  assert(Math.hypot(it.spawn.x - it.exit.x, it.spawn.y - it.exit.y) >= 20, 'spawn should not sit on the exit pad: ' + it.id);
  if (Array.isArray(it.npcs) && it.npcs.length) {
    withNpc++;
    for (const n of it.npcs) {
      assert(n.id && n.name && n.dialogue && n.dialogue.nodes && n.dialogue.start, 'interior NPC needs dialogue: ' + n.id);
      assert(Number.isFinite(n.x) && Number.isFinite(n.y), 'interior NPC needs coords: ' + n.id);
    }
  }
  if (it.reward) {
    secretRewards++;
    const sk = (Content.SKINS || []).find(s => s.id === it.reward);
    assert(sk, 'interior reward must be a real skin id: ' + it.reward);
    assert(sk.secret && sk.price === 0, 'interior reward cosmetic must be secret + non-purchasable (curiosity, not power): ' + it.reward);
  }
}
assert(withNpc >= 3, 'at least three buildings should have NPCs inside');
assert(secretRewards >= 1, 'at least one building should be a secret with a cosmetic reward');

console.log('  ok  interiors: ' + INTERIORS.length + ' buildings, ' + withNpc + ' with NPCs, ' + secretRewards + ' secret(s); all escapable + in-bounds');

/* ----------------------------- client: interior wiring ------------------ */
const need = [
  ['function enterInterior(', 'client should have enterInterior()'],
  ['function exitInterior(', 'client should have exitInterior()'],
  ['function updateInterior(', 'client should drive interior movement'],
  ['function drawInterior(', 'client should render the interior room'],
  ['function nearestDoor(', 'client should detect overworld doors'],
  ["state.mode==='interior'", 'client update/draw should branch on interior mode'],
  ['function drawBuildings(', 'client should draw building facades + doors in town'],
  ['drawBuildings();', 'town decor pass should render buildings'],
  ["r.mode==='interior'&&r.interior===it.id", 'interior render should show peers sharing the room'],
  ["Object.values(remotes).filter(r=>r.mode!=='interior')", 'town scene should exclude interior peers (they send room-local coords)'],
  // proximity chat client wiring
  ['function receiveChat(', 'client should handle inbound chat'],
  ['function drawChatBubbles(', 'client should render chat bubbles'],
  ['if(dist(player,r)>CHAT_RADIUS)return;', 'chat should be proximity-filtered (out of earshot is silent)'],
  ['if(!sameRoomAsMe(m.interior))return;', 'chat should be room-scoped (different building = unheard)'],
  ['Net.sendChat', 'client should send chat over the realm socket'],
  ['if(Chat.isOpen()){', 'keydown should swallow game keys while typing in chat'],
];
for (const [needle, msg] of need) assert(index.includes(needle), msg);

console.log('  ok  client wiring: interior mode + proximity chat hooks present');
console.log('chat + interiors verification passed (' + INTERIORS.length + ' interiors).');
process.exit(0); // CI-hardening: exit deterministically so a lingering handle can't wedge the runner.
