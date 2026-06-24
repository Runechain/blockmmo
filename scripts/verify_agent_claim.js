/* Unit tests for game/agent-claim.js — the agent claim-code flow core (claim store + bindings +
 * agent signature verification). Pure: no server, no live grid. */
const assert = require('assert');
const crypto = require('crypto');
const path = require('path');

const claim = require(path.join(__dirname, '..', 'game', 'agent-claim.js'));
const identity = require(path.join(__dirname, '..', 'game', 'identity.js'));

let passed = 0;
function ok(label) { passed++; if (process.env.VERBOSE) console.log('  ok -', label); }
function b64url(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }

// An agent's ed25519 keypair (auto-generated locally by the worker).
function makeAgent() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  return { raw, pubB64: b64url(raw), address: identity.solanaAddress(raw), sign: (m) => crypto.sign(null, Buffer.from(m, 'utf8'), privateKey) };
}

// ---- claim code format ---------------------------------------------------------------------------
{
  const code = claim.genClaimCode();
  assert.match(code, /^[2-9A-Z]{4}-[2-9A-Z]{4}$/, 'code is grouped base32');
  assert(!/[01OILU]/.test(code), 'no ambiguous characters');
  assert.strictEqual(claim.normalizeCode('k7pq-3rx9'), 'K7PQ3RX9', 'normalize upcases + strips separators');
  ok('claim code format + normalize');
}

// ---- agent key + signature -----------------------------------------------------------------------
{
  const agent = makeAgent();
  const parsed = claim.parseAgentPubkey(agent.pubB64);
  assert(parsed && parsed.address === agent.address, 'parses a 32-byte ed25519 key to an address');
  assert.strictEqual(claim.parseAgentPubkey('not-valid'), null, 'rejects junk');
  assert.strictEqual(claim.parseAgentPubkey(b64url(Buffer.alloc(31))), null, 'rejects wrong length');

  const msg = claim.buildAgentAuthMessage({ agentAddress: agent.address, nonce: 'n1', issuedAt: 1000 });
  assert.match(msg, /^runechain-agent-v1\n/);
  assert.strictEqual(claim.verifyAgentSignature(agent.raw, msg, agent.sign(msg)), true, 'valid agent signature verifies');
  assert.strictEqual(claim.verifyAgentSignature(agent.raw, msg + 'x', agent.sign(msg)), false, 'tampered fails');
  assert.strictEqual(claim.verifyAgentSignature(makeAgent().raw, msg, agent.sign(msg)), false, 'wrong key fails');
  ok('agent key parse + auth message + ed25519 verify');
}

// ---- claim store lifecycle -----------------------------------------------------------------------
{
  let t = 1000;
  const store = claim.createClaimStore({ ttlMs: 100, now: () => t });
  const agent = makeAgent();

  const started = store.start({ agentPubkey: agent.pubB64, label: 'codex@laptop' });
  assert(started.ok && /-/.test(started.code), 'start returns a code');
  assert.strictEqual(started.agentAddress, agent.address);
  assert.strictEqual(store.start({ agentPubkey: 'junk' }).error.code, 'invalid_agent_key');

  // human looks it up
  const look = store.lookup(started.code);
  assert.strictEqual(look.status, 'pending');
  assert.strictEqual(look.label, 'codex@laptop');
  assert.strictEqual(look.agentAddress, agent.address);

  // agent polls -> still pending
  assert.strictEqual(store.poll(started.code).status, 'pending');

  // human confirms -> bound to their account
  const conf = store.confirm(started.code, 'acct_human1');
  assert(conf.ok && conf.accountId === 'acct_human1' && conf.agent.address === agent.address);

  // agent polls -> confirmed + learns its account
  const polled = store.poll(started.code);
  assert.strictEqual(polled.status, 'confirmed');
  assert.strictEqual(polled.accountId, 'acct_human1');

  // re-confirm rejected; codes are single-use for confirmation
  assert.strictEqual(store.confirm(started.code, 'acct_other').error.code, 'already_confirmed');

  // lowercase/spaced entry still resolves (humans type loosely)
  assert.strictEqual(store.lookup(started.code.toLowerCase().replace('-', ' ')).status, 'confirmed');

  // expiry
  t = 1101;
  assert.strictEqual(store.poll(started.code).status, 'expired', 'expired after ttl');
  assert.strictEqual(store.lookup(started.code).error.code, 'invalid_claim_code');
  ok('claim store: start -> lookup -> poll -> confirm -> poll -> expire');
}

// ---- account bindings + index --------------------------------------------------------------------
{
  const account = { id: 'acct_1', characters: {} };
  const a1 = makeAgent(); const a2 = makeAgent();
  claim.bindAgent(account, claim.parseAgentPubkey(a1.pubB64), 'agent-1', 100);
  claim.bindAgent(account, claim.parseAgentPubkey(a2.pubB64), 'agent-2', 100);
  assert.strictEqual(account.agents.length, 2, 'a fleet: two agents on one account');

  // idempotent re-bind by address (no dup), reactivates a revoked one
  claim.bindAgent(account, claim.parseAgentPubkey(a1.pubB64), 'agent-1b', 200);
  assert.strictEqual(account.agents.length, 2, 're-bind same key does not duplicate');
  assert.strictEqual(account.agents.find((a) => a.address === a1.address).label, 'agent-1b', 'label updates');

  // index maps active agents -> account
  let index = claim.buildAgentIndex({ acct_1: account });
  assert.strictEqual(index.get(a1.address), 'acct_1');
  assert.strictEqual(index.get(a2.address), 'acct_1');

  // revoke removes from the active index
  assert.strictEqual(claim.revokeAgent(account, a1.address, 300), true);
  assert.strictEqual(claim.revokeAgent(account, a1.address, 300), false, 'double-revoke is a no-op');
  index = claim.buildAgentIndex({ acct_1: account });
  assert.strictEqual(index.has(a1.address), false, 'revoked agent not in index');
  assert.strictEqual(index.get(a2.address), 'acct_1', 'other agent still active');

  // re-claiming a revoked agent reactivates it
  claim.bindAgent(account, claim.parseAgentPubkey(a1.pubB64), 'agent-1', 400);
  index = claim.buildAgentIndex({ acct_1: account });
  assert.strictEqual(index.get(a1.address), 'acct_1', 're-claim reactivates');
  ok('account bindings: fleet + idempotent + revoke + reactivate + index');
}

console.log(`agent claim verification passed (${passed} groups)`);
