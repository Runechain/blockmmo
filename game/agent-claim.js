/* RUNECHAIN agent claim flow (grid-identity: "claim your agent" device-authorization).
 *
 * A grid worker (agent) auto-generates an ed25519 keypair locally — the operator never sees it.
 * `molt worker start` POSTs the agent's PUBLIC key to /claim/start, gets back a short human-enterable
 * CLAIM CODE, prints it with the /claim URL, and polls /claim/poll. The logged-in human opens /claim,
 * sees what's being claimed (the agent's label + code), and confirms — binding agentPubkey -> their
 * game account. The agent then authenticates to the broker by SIGNING its requests with the keypair;
 * the broker verifies the signature against this game-issued binding (the game is the identity
 * authority; the broker is a relying party). One account can claim a FLEET of agents.
 *
 * Zero-dep, server/test-only. Reuses the ed25519/base64url primitives from game/identity.js.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RUNECHAIN_AGENT_CLAIM = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const nodeCrypto = (typeof require === 'function') ? require('crypto') : null;
  const identity = (typeof require === 'function') ? require('./identity.js') : (typeof globalThis !== 'undefined' ? globalThis.RUNECHAIN_IDENTITY : null);

  // Human-enterable claim code: Crockford-ish base32 (no 0/O/1/I/L/U to avoid ambiguity), grouped.
  const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  function genClaimCode() {
    const bytes = nodeCrypto ? nodeCrypto.randomBytes(8) : null;
    let s = '';
    for (let i = 0; i < 8; i++) s += CODE_ALPHABET[(bytes ? bytes[i] : 0) % CODE_ALPHABET.length];
    return s.slice(0, 4) + '-' + s.slice(4); // e.g. "K7PQ-3RX9"
  }
  function normalizeCode(code) {
    return String(code == null ? '' : code).toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 8);
  }

  // The agent's public key is a 32-byte ed25519 key sent as base64url. Validate + canonicalize it.
  function parseAgentPubkey(b64) {
    if (!identity) return null;
    const raw = identity.base64urlDecode(b64);
    if (!raw || raw.length !== 32) return null;
    return { raw, b64: b64, address: identity.solanaAddress(raw) }; // base58 address = stable id
  }

  // Message an agent signs to authenticate a request to the broker (domain-tagged + bound to a nonce).
  function buildAgentAuthMessage(parts) {
    parts = parts || {};
    return ['runechain-agent-v1', 'agent=' + (parts.agentAddress || ''), 'nonce=' + (parts.nonce || ''), 'issued=' + (parts.issuedAt || '')].join('\n');
  }

  function verifyAgentSignature(agentRawPubkey, message, sigRaw) {
    return !!identity && identity.verifyEd25519(agentRawPubkey, message, sigRaw);
  }

  // ---- ephemeral claim-code store (TTL'd; codes are single-confirm) -------------------------------
  function createClaimStore(opts) {
    opts = opts || {};
    const ttlMs = opts.ttlMs == null ? 10 * 60 * 1000 : opts.ttlMs; // 10 min to confirm
    const now = typeof opts.now === 'function' ? opts.now : () => Date.now();
    const byCode = new Map();

    function sweep() { const t = now(); for (const [k, v] of byCode) if (v.expiresAt <= t) byCode.delete(k); }

    return {
      // Agent starts a claim with its public key + a human-readable label ("codex@laptop").
      start(input) {
        sweep();
        const parsed = parseAgentPubkey(input && input.agentPubkey);
        if (!parsed) return { ok: false, error: { code: 'invalid_agent_key', message: 'Agent public key must be a 32-byte base64url ed25519 key.' } };
        const label = String((input && input.label) || 'agent').trim().slice(0, 48) || 'agent';
        let code; // avoid the rare collision
        do { code = genClaimCode(); } while (byCode.has(normalizeCode(code)));
        const at = now();
        byCode.set(normalizeCode(code), { code, agent: parsed, label, status: 'pending', accountId: null, createdAt: at, expiresAt: at + ttlMs });
        return { ok: true, code, label, agentAddress: parsed.address, expiresAt: at + ttlMs };
      },
      // What is this code claiming? (shown to the human on /claim before they confirm.)
      lookup(code) {
        sweep();
        const e = byCode.get(normalizeCode(code));
        if (!e) return { ok: false, error: { code: 'invalid_claim_code', message: 'Claim code is unknown or expired.' } };
        return { ok: true, code: e.code, label: e.label, agentAddress: e.agent.address, status: e.status };
      },
      // Human (already authenticated to an account) confirms -> records the account to bind.
      confirm(code, accountId) {
        sweep();
        const e = byCode.get(normalizeCode(code));
        if (!e) return { ok: false, error: { code: 'invalid_claim_code', message: 'Claim code is unknown or expired.' } };
        if (e.status === 'confirmed') return { ok: false, error: { code: 'already_confirmed', message: 'This claim was already confirmed.' } };
        e.status = 'confirmed';
        e.accountId = accountId;
        e.confirmedAt = now();
        return { ok: true, agent: e.agent, label: e.label, accountId };
      },
      deny(code) {
        const e = byCode.get(normalizeCode(code));
        if (e) e.status = 'denied';
        return { ok: !!e };
      },
      // Agent polls until confirmed/denied/expired.
      poll(code) {
        sweep();
        const e = byCode.get(normalizeCode(code));
        if (!e) return { ok: true, status: 'expired' };
        return { ok: true, status: e.status, agentAddress: e.agent.address, accountId: e.status === 'confirmed' ? e.accountId : null };
      },
      size() { sweep(); return byCode.size; },
    };
  }

  // ---- persistent agent bindings on the account --------------------------------------------------
  function ensureAgentsShape(account) {
    if (!account || typeof account !== 'object') return account;
    if (!Array.isArray(account.agents)) account.agents = [];
    return account;
  }

  // Bind (or re-activate) an agent pubkey on an account. Idempotent by pubkey address.
  function bindAgent(account, agent, label, at) {
    ensureAgentsShape(account);
    let entry = account.agents.find((a) => a.address === agent.address);
    if (!entry) {
      entry = { address: agent.address, publicKey: agent.b64, label: label || 'agent', claimedAt: at, lastSeenAt: at, revokedAt: null };
      account.agents.push(entry);
    } else {
      entry.revokedAt = null; // re-claiming reactivates
      entry.label = label || entry.label;
      entry.lastSeenAt = at;
    }
    return entry;
  }

  function revokeAgent(account, address, at) {
    ensureAgentsShape(account);
    const entry = account.agents.find((a) => a.address === address);
    if (!entry || entry.revokedAt) return false;
    entry.revokedAt = at;
    return true;
  }

  // Build agentAddress -> accountId index over all accounts (active bindings only). Rebuilt on load.
  function buildAgentIndex(accounts) {
    const index = new Map();
    for (const account of Object.values(accounts || {})) {
      if (!account || !account.id) continue;
      ensureAgentsShape(account);
      for (const a of account.agents) if (a && a.address && !a.revokedAt) index.set(a.address, account.id);
    }
    return index;
  }

  return {
    genClaimCode,
    normalizeCode,
    parseAgentPubkey,
    buildAgentAuthMessage,
    verifyAgentSignature,
    createClaimStore,
    ensureAgentsShape,
    bindAgent,
    revokeAgent,
    buildAgentIndex,
  };
});
