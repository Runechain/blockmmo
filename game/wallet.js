/* RUNECHAIN wallet abstraction (PRD F6.4 / A3).
 *
 * A browser-extension wallet (Phantom) is treated as ONE adapter, not the only path, so a future
 * mobile-wallet connection is not designed out. Game/UI code talks only to the adapter contract
 * and the manager below — never to a concrete wallet SDK — so swapping wallets is a new adapter
 * module with zero game-logic changes (A3). Buildless: no bundler, no wallet SDK dependency (A1).
 *
 * Transaction-construction seam (F6.4): the authoritative server BUILDS and serializes the
 * transaction; the client adapter only SIGNS (and optionally submits) it. Adapters therefore take
 * an already-serialized transaction and must never construct one.
 */
(function (root, factory) {
  const wallet = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = wallet;
  root.RUNECHAIN_WALLET = wallet;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {

  // The contract every wallet adapter must satisfy. Game code depends ONLY on this shape.
  const ADAPTER_METHODS = ['connect', 'disconnect', 'getPublicKey', 'signTransaction'];

  function isAdapter(a) {
    return !!a && typeof a.name === 'string' && ADAPTER_METHODS.every((m) => typeof a[m] === 'function');
  }

  // Phantom browser-extension adapter — the first concrete adapter. Wraps the injected provider
  // (window.solana). The provider is injectable so this is testable without the extension.
  function createPhantomAdapter(provider) {
    // Resolve the injected provider LAZILY on every call. Phantom injects window.solana
    // asynchronously (often after this adapter is constructed at page load), so capturing it once
    // would leave it null forever and make connect() fail even when Phantom is installed.
    const getProvider = () => provider || (typeof root !== 'undefined' ? root.solana : null);
    let pubkey = null;
    function readKey(src) {
      const k = src && src.publicKey;
      return k && typeof k.toString === 'function' ? k.toString() : (typeof k === 'string' ? k : null);
    }
    const notFound = () => new Error('Phantom wallet not found — install the Phantom extension, then reload.');
    return {
      name: 'phantom',
      available() { const p = getProvider(); return !!(p && p.isPhantom); },
      async connect() {
        const p = getProvider();
        if (!p) throw notFound();
        const res = await p.connect();
        pubkey = readKey(res) || readKey(p);
        return pubkey;
      },
      async disconnect() {
        const p = getProvider();
        if (p && typeof p.disconnect === 'function') await p.disconnect();
        pubkey = null;
      },
      getPublicKey() { return pubkey; },
      // tx: a server-serialized transaction. The adapter signs; it never builds the tx.
      async signTransaction(tx) {
        const p = getProvider();
        if (!p) throw notFound();
        if (!pubkey) throw new Error('connect() before signing');
        return p.signTransaction(tx);
      },
      // Sign-in ownership proof: sign an arbitrary UTF-8 challenge. Returns raw signature + public
      // key bytes so the caller can encode them for the server's ed25519 verification.
      async signMessage(message) {
        const p = getProvider();
        if (!p) throw notFound();
        if (!pubkey) throw new Error('connect() before signing');
        const bytes = new TextEncoder().encode(String(message));
        const res = await p.signMessage(bytes, 'utf8');
        const signatureBytes = res && res.signature ? res.signature : res;
        const pk = (res && res.publicKey && res.publicKey.toBytes && res.publicKey.toBytes())
          || (p.publicKey && p.publicKey.toBytes && p.publicKey.toBytes()) || null;
        return { signatureBytes, publicKeyBytes: pk };
      },
    };
  }

  // Deterministic mock adapter — the devnet/test path when no extension is present. It never
  // touches real funds; it returns a signed-shaped envelope so flows can be exercised end-to-end.
  function createMockAdapter(opts) {
    opts = opts || {};
    const key = opts.publicKey || 'MockWa11et1111111111111111111111111111111111';
    let pubkey = null;
    return {
      name: opts.name || 'mock',
      available() { return true; },
      async connect() { pubkey = key; return pubkey; },
      async disconnect() { pubkey = null; },
      getPublicKey() { return pubkey; },
      async signTransaction(tx) {
        if (!pubkey) throw new Error('connect() before signing');
        return { signedBy: pubkey, payload: tx, mock: true };
      },
      async signMessage(message) {
        if (!pubkey) throw new Error('connect() before signing');
        return { signatureBytes: new Uint8Array(64), publicKeyBytes: new Uint8Array(32), message: String(message), mock: true };
      },
    };
  }

  // Adapter-agnostic manager. Game/UI code connects and signs through here and never imports a
  // wallet SDK directly — so adding a mobile adapter requires only register()ing a new module.
  function createWalletManager(opts) {
    opts = opts || {};
    const registry = {};
    let active = null;
    function register(adapter) {
      if (!isAdapter(adapter)) throw new Error('adapter must implement: ' + ADAPTER_METHODS.join(', '));
      registry[adapter.name] = adapter;
      return adapter;
    }
    (opts.adapters || []).forEach(register);
    return {
      register,
      list() { return Object.keys(registry); },
      has(name) { return Object.prototype.hasOwnProperty.call(registry, name); },
      get(name) { return registry[name] || null; },
      activeName() { return active ? active.name : null; },
      async connect(name) {
        const a = registry[name];
        if (!a) throw new Error('unknown wallet adapter: ' + name);
        await a.connect();
        active = a;
        return a.getPublicKey();
      },
      async disconnect() {
        if (active) { await active.disconnect(); active = null; }
      },
      getPublicKey() { return active ? active.getPublicKey() : null; },
      // Sign a server-built, serialized transaction with whichever adapter is active.
      async signTransaction(tx) {
        if (!active) throw new Error('no wallet connected');
        return active.signTransaction(tx);
      },
      // Sign a sign-in ownership challenge with the active adapter.
      async signMessage(message) {
        if (!active) throw new Error('no wallet connected');
        if (typeof active.signMessage !== 'function') throw new Error('active wallet cannot sign messages');
        return active.signMessage(message);
      },
    };
  }

  return { ADAPTER_METHODS, isAdapter, createPhantomAdapter, createMockAdapter, createWalletManager };
});
