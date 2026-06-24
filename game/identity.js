/* RUNECHAIN sign-in identity binding (PRD A3 / grid-identity design).
 *
 * The game account is the single auth truth. Sign-up links THREE credentials onto one account:
 *   - SSO        (Google) — the human-ish root + recovery anchor.
 *   - wallet     (Solana, REQUIRED) — the economic identity (Gold/RUNE/character/cash-out + signing).
 *   - device key (browser P-256, see game/account.js) — the device binding.
 *
 * v1 rule set (deliberately strict + simple): every leg is 1:1 with the account.
 *   - one Google sub  <-> one account   (enforced: a second device signing in with the same Google
 *                                         account is rejected — this IS "one signup per device")
 *   - one wallet      <-> one account   (the hard sybil gate; stake reinforces it later)
 *   - account stays ANCHORED on the device-derived id (game economy keys off it — no re-keying).
 * Cross-device recovery (re-bind a new device under an existing SSO) is intentionally deferred; the
 * indices below already make it a small future addition.
 *
 * This module is zero-dep and server/test-only (the browser client never imports it). It holds the
 * crypto primitives (Solana ed25519 verification, base58) and the PURE binding-decision logic so the
 * uniqueness rules are unit-testable without a live OAuth provider or wallet extension.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RUNECHAIN_IDENTITY = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // crypto is only needed on the Node/server/test path; the browser never calls the verify helpers.
  const nodeCrypto = (typeof require === 'function') ? require('crypto') : null;

  // ---- base58 (Bitcoin/Solana alphabet) -----------------------------------------------------------
  const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const B58_MAP = (() => {
    const m = {};
    for (let i = 0; i < B58_ALPHABET.length; i++) m[B58_ALPHABET[i]] = i;
    return m;
  })();

  function base58Encode(bytes) {
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || []);
    if (!buf.length) return '';
    const digits = []; // big-endian base-58 accumulator (no phantom leading digit)
    for (let i = 0; i < buf.length; i++) {
      let carry = buf[i];
      for (let j = 0; j < digits.length; j++) {
        carry += digits[j] << 8;
        digits[j] = carry % 58;
        carry = (carry / 58) | 0;
      }
      while (carry > 0) { digits.push(carry % 58); carry = (carry / 58) | 0; }
    }
    let out = '';
    for (let k = 0; k < buf.length && buf[k] === 0; k++) out += '1'; // each leading zero byte -> '1'
    for (let q = digits.length - 1; q >= 0; q--) out += B58_ALPHABET[digits[q]];
    return out;
  }

  function base58Decode(str) {
    if (typeof str !== 'string') return null;
    if (str.length === 0) return Buffer.alloc(0);
    const bytes = []; // big-endian byte accumulator
    for (const ch of str) {
      const val = B58_MAP[ch];
      if (val === undefined) return null;
      let carry = val;
      for (let j = 0; j < bytes.length; j++) {
        carry += bytes[j] * 58;
        bytes[j] = carry & 0xff;
        carry >>= 8;
      }
      while (carry > 0) { bytes.push(carry & 0xff); carry >>= 8; }
    }
    for (let k = 0; k < str.length && str[k] === '1'; k++) bytes.push(0); // leading '1' -> zero byte
    return Buffer.from(bytes.reverse());
  }

  // ---- base64url ----------------------------------------------------------------------------------
  function base64urlDecode(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]*$/.test(value) || !value.length) return null;
    const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
    try { return Buffer.from(padded, 'base64'); } catch (_) { return null; }
  }

  // ---- ed25519 (Solana) verification --------------------------------------------------------------
  // Wrap a raw 32-byte ed25519 public key in the fixed SPKI DER prefix so node:crypto can import it.
  const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

  function ed25519KeyFromRaw(raw32) {
    if (!nodeCrypto) throw new Error('ed25519 verification requires node:crypto');
    if (!Buffer.isBuffer(raw32) || raw32.length !== 32) throw new Error('ed25519 public key must be 32 bytes');
    return nodeCrypto.createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, raw32]), format: 'der', type: 'spki' });
  }

  // Verify a Solana wallet signature. pubKeyRaw/sigRaw are Buffers (32 / 64 bytes), message a string.
  function verifyEd25519(pubKeyRaw, message, sigRaw) {
    try {
      if (!Buffer.isBuffer(pubKeyRaw) || pubKeyRaw.length !== 32) return false;
      if (!Buffer.isBuffer(sigRaw) || sigRaw.length !== 64) return false;
      const key = ed25519KeyFromRaw(pubKeyRaw);
      return nodeCrypto.verify(null, Buffer.from(String(message), 'utf8'), key, sigRaw);
    } catch (_) {
      return false;
    }
  }

  // Canonical Solana address (base58 of the raw 32-byte public key).
  function solanaAddress(pubKeyRaw) {
    if (!Buffer.isBuffer(pubKeyRaw) || pubKeyRaw.length !== 32) return null;
    return base58Encode(pubKeyRaw);
  }

  // ---- challenge messages -------------------------------------------------------------------------
  // The wallet proves ownership by signing this exact message; the nonce is single-use + TTL'd server-side.
  function buildWalletChallenge(parts) {
    parts = parts || {};
    return [
      'runechain-wallet-v1',
      'season=' + (parts.seasonId || ''),
      'wallet=' + (parts.walletAddress || ''),
      'nonce=' + (parts.nonce || ''),
      'issued=' + (parts.issuedAt || ''),
    ].join('\n');
  }

  // ---- account identity shape (additive; no file-version bump) ------------------------------------
  function canonicalDeviceKey(jwk) {
    if (!jwk) return '';
    return JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y });
  }

  // Migrate a v1 account (single `publicKey`) into the additive {identity, devices[]} shape in place.
  function ensureIdentityShape(account) {
    if (!account || typeof account !== 'object') return account;
    if (!account.identity || typeof account.identity !== 'object' || Array.isArray(account.identity)) {
      account.identity = { sso: null, wallet: null };
    }
    if (!('sso' in account.identity)) account.identity.sso = null;
    if (!('wallet' in account.identity)) account.identity.wallet = null;
    if (!Array.isArray(account.devices)) {
      account.devices = [];
      if (account.publicKey) {
        account.devices.push({
          type: account.credentialType || 'browser-p256-v1',
          publicKey: account.publicKey,
          boundAt: account.createdAt || null,
          lastSeenAt: account.lastSeenAt || null,
        });
      }
    }
    return account;
  }

  function ssoIndexKey(provider, sub) {
    return String(provider || 'sso') + ':' + String(sub || '');
  }

  // Build the in-memory uniqueness indices from the persisted accounts map. Not persisted — rebuilt on load.
  function buildIndex(accounts) {
    const index = {
      sso: new Map(),            // ssoIndexKey -> accountId
      wallet: new Map(),         // wallet address -> accountId
      ssoByAccount: new Map(),   // accountId -> { provider, sub }
      walletByAccount: new Map(),// accountId -> wallet address
    };
    for (const account of Object.values(accounts || {})) {
      if (!account || !account.id) continue;
      ensureIdentityShape(account);
      const sso = account.identity.sso;
      if (sso && sso.sub) {
        index.sso.set(ssoIndexKey(sso.provider, sso.sub), account.id);
        index.ssoByAccount.set(account.id, { provider: sso.provider, sub: sso.sub });
      }
      const wallet = account.identity.wallet;
      if (wallet && wallet.address) {
        index.wallet.set(wallet.address, account.id);
        index.walletByAccount.set(account.id, wallet.address);
      }
    }
    return index;
  }

  function err(code, message) {
    return { ok: false, error: { code, message } };
  }

  // PURE binding decision — the heart of the uniqueness rules. Given already-verified facts (the device
  // signature, SSO session, and wallet signature are checked by the caller) plus the current index,
  // decide the canonical account id and whether the link is allowed. No I/O, no mutation.
  function decideBinding(input) {
    input = input || {};
    const index = input.index || buildIndex({});
    const deviceAccountId = input.deviceAccountId;
    if (!deviceAccountId) return err('invalid_device', 'A verified device credential is required.');

    const ssoSub = input.ssoSub || null;
    const ssoProvider = input.ssoProvider || 'google';
    const walletAddress = input.walletAddress || null;

    if (input.requireSso && !ssoSub) return err('sso_required', 'Sign in with Google before joining.');
    if (input.requireWallet && !walletAddress) return err('wallet_required', 'Connect and verify your wallet before joining.');

    // v1: the account is anchored on the device-derived id (no cross-device recovery yet).
    const canonicalId = deviceAccountId;

    if (ssoSub) {
      const owner = index.sso.get(ssoIndexKey(ssoProvider, ssoSub));
      if (owner && owner !== canonicalId) {
        return err('sso_in_use', 'This Google account is already linked to another device. One account per device.');
      }
      const existing = index.ssoByAccount.get(canonicalId);
      if (existing && (existing.provider !== ssoProvider || existing.sub !== ssoSub)) {
        return err('sso_conflict', 'This device is already linked to a different sign-in.');
      }
    }

    if (walletAddress) {
      const owner = index.wallet.get(walletAddress);
      if (owner && owner !== canonicalId) {
        return err('wallet_in_use', 'That wallet is already linked to another account.');
      }
      const existing = index.walletByAccount.get(canonicalId);
      if (existing && existing !== walletAddress) {
        return err('wallet_mismatch', 'This account is already linked to a different wallet.');
      }
    }

    return { ok: true, accountId: canonicalId };
  }

  // Apply verified links onto an account in place. Caller persists + reindexes afterward.
  function applyIdentityLinks(account, links) {
    links = links || {};
    ensureIdentityShape(account);
    const at = links.at || null;
    if (links.ssoProfile && links.ssoProfile.sub) {
      const p = links.ssoProfile;
      account.identity.sso = {
        provider: p.provider || 'google',
        sub: String(p.sub),
        email: p.email || null,
        emailVerified: !!p.emailVerified,
        name: p.name || null,
        linkedAt: account.identity.sso && account.identity.sso.linkedAt || at,
        lastSeenAt: at,
      };
    }
    if (links.walletAddress) {
      account.identity.wallet = {
        chain: links.walletChain || 'solana',
        address: links.walletAddress,
        boundAt: account.identity.wallet && account.identity.wallet.boundAt || at,
        lastSeenAt: at,
      };
    }
    if (links.devicePublicKey) {
      const key = canonicalDeviceKey(links.devicePublicKey);
      let device = account.devices.find((d) => canonicalDeviceKey(d.publicKey) === key);
      if (!device) {
        device = { type: links.deviceType || 'browser-p256-v1', publicKey: links.devicePublicKey, boundAt: at, lastSeenAt: at };
        account.devices.push(device);
      } else {
        device.lastSeenAt = at;
      }
    }
    return account;
  }

  return {
    base58Encode,
    base58Decode,
    base64urlDecode,
    verifyEd25519,
    solanaAddress,
    buildWalletChallenge,
    canonicalDeviceKey,
    ensureIdentityShape,
    ssoIndexKey,
    buildIndex,
    decideBinding,
    applyIdentityLinks,
  };
});
