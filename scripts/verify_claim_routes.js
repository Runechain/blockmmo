/* HTTP integration test of the agent claim flow over a live socket:
 *   agent POST /claim/start -> human POST /claim/confirm (session-authed) -> agent poll confirmed
 *   -> broker POST /claim/verify (signed) -> /claim/agents + /claim/revoke.
 * A session is minted directly via an injected session store; the bound account is created by a
 * real identity join so resolveAccountBySso() can map the session's sub -> account. */
const assert = require('assert');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const serverApi = require(path.join(root, 'server.js'));
const identity = require(path.join(root, 'game', 'identity.js'));
const agentClaim = require(path.join(root, 'game', 'agent-claim.js'));
const { createStore } = require(path.join(root, 'game', 'oauth-google.js'));

function b64url(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }
function req(port, method, p, headers, body) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, method, path: p, headers: headers || {} }, (res) => {
      let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => { let body = {}; try { body = d ? JSON.parse(d) : {}; } catch (_) {} resolve({ status: res.statusCode, body, raw: d }); });
    });
    r.on('error', reject);
    if (body != null) r.end(typeof body === 'string' ? body : JSON.stringify(body)); else r.end();
  });
}
function makeClient(id) { return { id, name: id, socket: { writable: true, writes: [], write(f) { this.writes.push(f); }, end() {} }, last: {}, sso: null }; }
function readMessages(c) { let b = Buffer.concat(c.socket.writes.splice(0)); const m = []; while (b.length) { const f = serverApi.decodeFrame(b); m.push(JSON.parse(f.payload.toString('utf8'))); b = f.rest; } return m; }
function makeDevice() { const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' }); return { publicKey: publicKey.export({ format: 'jwk' }), sign: (m) => b64url(crypto.sign('sha256', Buffer.from(m), { key: privateKey, dsaEncoding: 'ieee-p1363' })) }; }
function makeAgent() { const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519'); const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32); return { raw, pubB64: b64url(raw), address: identity.solanaAddress(raw), sign: (m) => crypto.sign(null, Buffer.from(m, 'utf8'), privateKey) }; }

(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claim-routes-'));
  let nowMs = 5000;
  const sessionStore = createStore({ ttlMs: 1e9, now: () => nowMs });
  const realm = serverApi.createRealmServer({
    ledgerFile: path.join(tempDir, 'ledger.json'), accountsFile: path.join(tempDir, 'accounts.json'),
    seasonId: 'season-one', difficulty: 1, now: () => nowMs, saveDelayMs: 0, quiet: true,
    requireIdentity: true, requireWallet: false,
    sessionStore, googleOAuth: { enabled: true, authUrl: () => '', exchangeCode: async () => ({ ok: false }) },
  });
  await new Promise((r) => realm.server.listen(0, '127.0.0.1', r));
  const port = realm.server.address().port;

  // --- create an account with an SSO binding (so the session's sub resolves to it) ----------------
  const sso = { provider: 'google', sub: 'sub-claim', email: 'c@x.io', emailVerified: true, name: 'Cy' };
  const device = makeDevice();
  const client = makeClient('c'); client.sso = sso;
  realm.handleParsedMessage(client, { t: 'account:challenge', credential: { type: 'browser-p256-v1', publicKey: device.publicKey } });
  const ch = readMessages(client).find((m) => m.t === 'account:challenge');
  const join = realm.handleParsedMessage(client, { t: 'join', name: 'Cy', credential: { type: 'browser-p256-v1', publicKey: device.publicKey, challengeId: ch.challengeId, signature: device.sign(ch.message) } });
  assert.strictEqual(join.ok, true, 'identity join (sso) creates the account');
  const accountId = join.accountId;
  const sid = sessionStore.create({ sso });           // a logged-in browser session for that human
  const authed = { Cookie: 'rc_session=' + sid };
  const json = { 'content-type': 'application/json' };

  const agent = makeAgent();

  // --- agent starts a claim -----------------------------------------------------------------------
  const started = await req(port, 'POST', '/claim/start', json, { agentPubkey: agent.pubB64, label: 'codex@laptop' });
  assert.strictEqual(started.status, 200);
  assert(started.body.code && /\/claim\?code=/.test(started.body.claimUrl), 'returns code + claim URL');
  assert.strictEqual(started.body.agentAddress, agent.address);
  const code = started.body.code;

  // agent polls -> pending
  assert.strictEqual((await req(port, 'GET', '/claim/poll?code=' + encodeURIComponent(code))).body.status, 'pending');

  // broker verify BEFORE binding -> not claimed
  const msg = agentClaim.buildAgentAuthMessage({ agentAddress: agent.address, nonce: 'n1', issuedAt: nowMs });
  let v = await req(port, 'POST', '/claim/verify', json, { agentPubkey: agent.pubB64, message: msg, signature: b64url(agent.sign(msg)) });
  assert.strictEqual(v.status, 401); assert.strictEqual(v.body.code, 'agent_not_claimed');

  // confirm WITHOUT a session -> rejected
  assert.strictEqual((await req(port, 'POST', '/claim/confirm', json, { code })).body.code, 'sso_required');

  // --- human confirms (session-authed) -> binds ---------------------------------------------------
  const conf = await req(port, 'POST', '/claim/confirm', Object.assign({}, json, authed), { code });
  assert.strictEqual(conf.status, 200, JSON.stringify(conf.body));
  assert.strictEqual(conf.body.agent.address, agent.address);

  // agent poll -> confirmed + learns its account
  const polled = (await req(port, 'GET', '/claim/poll?code=' + encodeURIComponent(code))).body;
  assert.strictEqual(polled.status, 'confirmed');
  assert.strictEqual(polled.accountId, accountId);

  // --- broker verify AFTER binding (valid signature) -> ok + the account --------------------------
  v = await req(port, 'POST', '/claim/verify', json, { agentPubkey: agent.pubB64, message: msg, signature: b64url(agent.sign(msg)) });
  assert.strictEqual(v.status, 200); assert.strictEqual(v.body.accountId, accountId); assert.strictEqual(v.body.agentAddress, agent.address);
  // tampered signature -> rejected
  assert.strictEqual((await req(port, 'POST', '/claim/verify', json, { agentPubkey: agent.pubB64, message: msg + 'x', signature: b64url(agent.sign(msg)) })).body.code, 'invalid_agent_signature');

  // --- fleet list + revoke ------------------------------------------------------------------------
  const list = (await req(port, 'GET', '/claim/agents', authed)).body;
  assert.strictEqual(list.agents.length, 1); assert.strictEqual(list.agents[0].address, agent.address);
  assert.strictEqual((await req(port, 'POST', '/claim/revoke', Object.assign({}, json, authed), { address: agent.address })).status, 200);
  // revoked -> verify fails again
  assert.strictEqual((await req(port, 'POST', '/claim/verify', json, { agentPubkey: agent.pubB64, message: msg, signature: b64url(agent.sign(msg)) })).body.code, 'agent_not_claimed');

  // --- the /claim page serves -----------------------------------------------------------------------
  const page = await req(port, 'GET', '/claim');
  assert.strictEqual(page.status, 200); assert(/Claim an agent/.test(page.raw), 'serves claim.html');

  realm.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('claim routes verification passed (start -> confirm -> poll -> broker verify -> revoke + page)');
})().catch((err) => { console.error(err); process.exit(1); });
