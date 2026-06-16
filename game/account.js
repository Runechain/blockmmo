(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RUNECHAIN_ACCOUNT = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const CREDENTIAL_TYPE = 'browser-p256-v1';
  const DB_NAME = 'runechain-account-v1';
  const STORE = 'credentials';
  const KEY_ID = CREDENTIAL_TYPE;

  function requireBrowserCrypto() {
    if (!root.crypto || !root.crypto.subtle || !root.indexedDB) {
      throw new Error('Browser account credentials require Web Crypto and IndexedDB.');
    }
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = root.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Failed to open account credential store.'));
    });
  }

  async function storeGet(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('Failed to read account credential.'));
    });
  }

  async function storeAdd(value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to store account credential.'));
    });
  }

  async function loadOrCreateAccount() {
    requireBrowserCrypto();
    let entry = await storeGet(KEY_ID);
    if (!entry) {
      entry = await createStoredCredential();
    }

    const publicKey = await exportPublicKey(entry.publicKey);
    const accountId = await deriveAccountId(publicKey);
    return {
      type: CREDENTIAL_TYPE,
      publicKey,
      accountId,
      async sign(message) {
        const bytes = new TextEncoder().encode(String(message));
        const signature = await root.crypto.subtle.sign(
          { name: 'ECDSA', hash: 'SHA-256' },
          entry.privateKey,
          bytes
        );
        return base64url(new Uint8Array(signature));
      },
    };
  }

  async function createStoredCredential() {
    const keyPair = await root.crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign', 'verify']
    );
    const entry = { id: KEY_ID, privateKey: keyPair.privateKey, publicKey: keyPair.publicKey, createdAt: Date.now() };
    try {
      await storeAdd(entry);
      return entry;
    } catch (err) {
      if (err && err.name === 'ConstraintError') {
        const winner = await storeGet(KEY_ID);
        if (winner) return winner;
      }
      throw err;
    }
  }

  async function exportPublicKey(publicKey) {
    const jwk = await root.crypto.subtle.exportKey('jwk', publicKey);
    return { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y };
  }

  async function deriveAccountId(publicKey) {
    const canonical = JSON.stringify({ crv: publicKey.crv, kty: publicKey.kty, x: publicKey.x, y: publicKey.y });
    const digest = await root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
    return 'acct_' + Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
  }

  function base64url(bytes) {
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return root.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  return { CREDENTIAL_TYPE, loadOrCreateAccount };
});
