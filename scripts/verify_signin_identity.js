/* Unit tests for game/identity.js — the sign-in binding core (SSO + wallet + device).
 * Pure: no realm server, no live OAuth, no wallet extension. Verifies the crypto primitives
 * (Solana ed25519 + base58) and the uniqueness-decision logic (one-per-device, one-per-wallet). */
const assert = require('assert');
const crypto = require('crypto');
const path = require('path');

const id = require(path.join(__dirname, '..', 'game', 'identity.js'));

let passed = 0;
function ok(label) { passed++; if (process.env.VERBOSE) console.log('  ok -', label); }

// ---- base58 round-trip + known vector ------------------------------------------------------------
{
  const samples = [Buffer.from([]), Buffer.from([0]), Buffer.from([0, 0, 1]), crypto.randomBytes(32), crypto.randomBytes(64)];
  for (const buf of samples) {
    const enc = id.base58Encode(buf);
    const dec = id.base58Decode(enc);
    assert.strictEqual(Buffer.compare(dec, buf), 0, 'base58 round-trip must be lossless');
  }
  // Known vector: 32 zero bytes -> 32 '1' chars (each leading zero byte is one '1').
  assert.strictEqual(id.base58Encode(Buffer.alloc(32)), '1'.repeat(32));
  // Invalid alphabet rejected.
  assert.strictEqual(id.base58Decode('0OIl'), null, 'base58 must reject characters outside the alphabet');
  ok('base58 round-trip + leading-zero + invalid-char');
}

// ---- ed25519 (Solana) signature verification -----------------------------------------------------
function makeSolanaWallet() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32); // last 32 bytes = raw key
  return {
    publicKeyRaw: raw,
    address: id.base58Encode(raw),
    sign(message) { return crypto.sign(null, Buffer.from(message, 'utf8'), privateKey); },
  };
}

{
  const wallet = makeSolanaWallet();
  const msg = id.buildWalletChallenge({ seasonId: 'season-one', walletAddress: wallet.address, nonce: 'n1', issuedAt: 1000 });
  const sig = wallet.sign(msg);

  assert.strictEqual(id.verifyEd25519(wallet.publicKeyRaw, msg, sig), true, 'valid signature must verify');
  assert.strictEqual(id.verifyEd25519(wallet.publicKeyRaw, msg + 'x', sig), false, 'tampered message must fail');
  assert.strictEqual(id.verifyEd25519(makeSolanaWallet().publicKeyRaw, msg, sig), false, 'wrong key must fail');
  assert.strictEqual(id.verifyEd25519(Buffer.alloc(31), msg, sig), false, 'malformed key length must fail');
  assert.strictEqual(id.verifyEd25519(wallet.publicKeyRaw, msg, Buffer.alloc(63)), false, 'malformed sig length must fail');

  // The address derived from the raw key round-trips through base58Decode back to the key bytes.
  assert.strictEqual(Buffer.compare(id.base58Decode(wallet.address), wallet.publicKeyRaw), 0);
  assert.strictEqual(id.solanaAddress(wallet.publicKeyRaw), wallet.address);
  ok('ed25519 verify (valid/tampered/wrong-key/malformed) + address derivation');
}

// ---- challenge message format --------------------------------------------------------------------
{
  const msg = id.buildWalletChallenge({ seasonId: 's1', walletAddress: 'Wallet111', nonce: 'abc', issuedAt: 42 });
  assert.match(msg, /^runechain-wallet-v1\n/, 'challenge must be domain-tagged');
  assert(msg.includes('wallet=Wallet111') && msg.includes('nonce=abc') && msg.includes('season=s1'));
  ok('wallet challenge message format');
}

// ---- shape migration (v1 account -> additive identity/devices) -----------------------------------
{
  const v1 = {
    id: 'acct_aaa', credentialType: 'browser-p256-v1', createdAt: 100, lastSeenAt: 200,
    publicKey: { kty: 'EC', crv: 'P-256', x: 'XX', y: 'YY' }, characters: {},
  };
  id.ensureIdentityShape(v1);
  assert.deepStrictEqual(v1.identity, { sso: null, wallet: null });
  assert.strictEqual(v1.devices.length, 1, 'legacy publicKey becomes devices[0]');
  assert.strictEqual(id.canonicalDeviceKey(v1.devices[0].publicKey), id.canonicalDeviceKey(v1.publicKey));
  assert.strictEqual(v1.devices[0].boundAt, 100);
  // Idempotent.
  id.ensureIdentityShape(v1);
  assert.strictEqual(v1.devices.length, 1, 'ensureIdentityShape must be idempotent');
  ok('v1 account shape migration is additive + idempotent');
}

// ---- index building ------------------------------------------------------------------------------
function acct(idStr, sub, walletAddr) {
  const a = { id: idStr, characters: {}, identity: { sso: null, wallet: null } };
  if (sub) a.identity.sso = { provider: 'google', sub };
  if (walletAddr) a.identity.wallet = { chain: 'solana', address: walletAddr };
  return a;
}

{
  const accounts = {
    acct_1: acct('acct_1', 'sub-1', 'WalletA'),
    acct_2: acct('acct_2', 'sub-2', null),
  };
  const index = id.buildIndex(accounts);
  assert.strictEqual(index.sso.get(id.ssoIndexKey('google', 'sub-1')), 'acct_1');
  assert.strictEqual(index.wallet.get('WalletA'), 'acct_1');
  assert.deepStrictEqual(index.ssoByAccount.get('acct_2'), { provider: 'google', sub: 'sub-2' });
  assert.strictEqual(index.walletByAccount.has('acct_2'), false, 'no wallet -> not indexed');
  ok('index building from persisted accounts');
}

// ---- decideBinding: the uniqueness heart ---------------------------------------------------------
{
  const empty = id.buildIndex({});

  // New signup, no requirement -> anchored on the device id.
  let r = id.decideBinding({ deviceAccountId: 'acct_new', ssoSub: 'sub-new', walletAddress: 'WalletNew', index: empty });
  assert.strictEqual(r.ok, true); assert.strictEqual(r.accountId, 'acct_new');

  // Requirement gating.
  assert.strictEqual(id.decideBinding({ deviceAccountId: 'acct_x', requireSso: true, index: empty }).error.code, 'sso_required');
  assert.strictEqual(id.decideBinding({ deviceAccountId: 'acct_x', ssoSub: 's', requireWallet: true, index: empty }).error.code, 'wallet_required');
  assert.strictEqual(id.decideBinding({ index: empty }).error.code, 'invalid_device');

  // Populated world: acct_1 owns sub-1 + WalletA.
  const populated = id.buildIndex({ acct_1: acct('acct_1', 'sub-1', 'WalletA') });

  // Same Google account from a DIFFERENT device -> rejected (one signup per device).
  assert.strictEqual(
    id.decideBinding({ deviceAccountId: 'acct_2', ssoSub: 'sub-1', index: populated }).error.code,
    'sso_in_use'
  );
  // Same Google account from the SAME device -> allowed (returning login).
  assert.strictEqual(id.decideBinding({ deviceAccountId: 'acct_1', ssoSub: 'sub-1', index: populated }).ok, true);
  // This device already linked to sub-1; signing in with a different Google -> conflict.
  assert.strictEqual(
    id.decideBinding({ deviceAccountId: 'acct_1', ssoSub: 'sub-OTHER', index: populated }).error.code,
    'sso_conflict'
  );
  // Wallet already owned by acct_1, presented from acct_2 -> rejected.
  assert.strictEqual(
    id.decideBinding({ deviceAccountId: 'acct_2', ssoSub: 'sub-2', walletAddress: 'WalletA', index: populated }).error.code,
    'wallet_in_use'
  );
  // acct_1 already has WalletA; presenting a different wallet -> mismatch.
  assert.strictEqual(
    id.decideBinding({ deviceAccountId: 'acct_1', ssoSub: 'sub-1', walletAddress: 'WalletB', index: populated }).error.code,
    'wallet_mismatch'
  );
  // Returning login with matching sso + matching wallet -> ok.
  assert.strictEqual(
    id.decideBinding({ deviceAccountId: 'acct_1', ssoSub: 'sub-1', walletAddress: 'WalletA', index: populated }).ok,
    true
  );
  ok('decideBinding uniqueness rules (sso/wallet/device 1:1)');
}

// ---- applyIdentityLinks --------------------------------------------------------------------------
{
  const a = { id: 'acct_link', characters: {}, publicKey: { kty: 'EC', crv: 'P-256', x: 'X1', y: 'Y1' }, createdAt: 5 };
  id.ensureIdentityShape(a);
  id.applyIdentityLinks(a, {
    ssoProfile: { provider: 'google', sub: 'sub-9', email: 'a@b.c', emailVerified: true, name: 'Ada' },
    walletAddress: 'WalletZ', walletChain: 'solana',
    devicePublicKey: { kty: 'EC', crv: 'P-256', x: 'X2', y: 'Y2' }, deviceType: 'browser-p256-v1',
    at: 1000,
  });
  assert.strictEqual(a.identity.sso.sub, 'sub-9');
  assert.strictEqual(a.identity.sso.email, 'a@b.c');
  assert.strictEqual(a.identity.wallet.address, 'WalletZ');
  assert.strictEqual(a.identity.wallet.boundAt, 1000);
  assert.strictEqual(a.devices.length, 2, 'new device key appended alongside the migrated legacy key');

  // Re-link same device key later: dedup (no new device), preserve original boundAt, bump lastSeenAt.
  id.applyIdentityLinks(a, { devicePublicKey: { kty: 'EC', crv: 'P-256', x: 'X2', y: 'Y2' }, at: 2000 });
  assert.strictEqual(a.devices.length, 2, 'same device key must not duplicate');
  const dev = a.devices.find((d) => d.publicKey.x === 'X2');
  assert.strictEqual(dev.boundAt, 1000);
  assert.strictEqual(dev.lastSeenAt, 2000);

  // Re-link sso preserves linkedAt.
  id.applyIdentityLinks(a, { ssoProfile: { provider: 'google', sub: 'sub-9' }, at: 3000 });
  assert.strictEqual(a.identity.sso.linkedAt, 1000, 'linkedAt is preserved across re-links');
  assert.strictEqual(a.identity.sso.lastSeenAt, 3000);
  ok('applyIdentityLinks binds + dedups + preserves bound/linked timestamps');
}

console.log(`sign-in identity verification passed (${passed} groups)`);
