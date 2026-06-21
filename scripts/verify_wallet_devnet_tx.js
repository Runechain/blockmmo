const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const {
  createRealmServer,
  createWalletDevnetPingRequest,
  WALLET_DEVNET_CLUSTER,
  WALLET_DEVNET_MEMO,
} = require(path.join(root, 'server.js'));

const SYSTEM_PROGRAM = '11111111111111111111111111111111';
const bs58ish = /^[1-9A-HJ-NP-Za-km-z]+$/;

function postJson(port, route, body) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body));
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: route,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null });
      });
    });
    req.on('error', reject);
    req.end(payload);
  });
}

(async () => {
  let pass = 0;
  const ok = (label) => { pass++; console.log('  ok  ' + label); };

  assert.strictEqual(WALLET_DEVNET_CLUSTER, 'devnet');
  assert.strictEqual(WALLET_DEVNET_MEMO, 'runechain wallet adapter devnet ping');
  assert.strictEqual(typeof createWalletDevnetPingRequest, 'function');

  const fakeConnection = {
    commitment: null,
    async getLatestBlockhash(commitment) {
      this.commitment = commitment;
      return {
        blockhash: SYSTEM_PROGRAM,
        lastValidBlockHeight: 12345,
      };
    },
  };

  const request = await createWalletDevnetPingRequest({
    publicKey: SYSTEM_PROGRAM,
    connection: fakeConnection,
  });
  assert.strictEqual(fakeConnection.commitment, 'confirmed');
  assert.strictEqual(request.cluster, 'devnet');
  assert.strictEqual(request.feePayer, SYSTEM_PROGRAM);
  assert.strictEqual(request.method, 'signAndSendTransaction');
  assert.strictEqual(request.params.options.preflightCommitment, 'confirmed');
  assert.strictEqual(request.memo, WALLET_DEVNET_MEMO);
  assert.strictEqual(request.recentBlockhash, SYSTEM_PROGRAM);
  assert.strictEqual(request.lastValidBlockHeight, 12345);
  assert(bs58ish.test(request.params.message), 'Phantom request message should be bs58 encoded');
  ok('server builds a Phantom signAndSendTransaction request for a devnet wallet ping');

  await assert.rejects(
    createWalletDevnetPingRequest({ publicKey: 'not-a-solana-key', connection: fakeConnection }),
    /invalid wallet public key/i,
  );
  ok('server rejects invalid wallet public keys before building a transaction');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallet-devnet-'));
  const realm = createRealmServer({
    port: 0,
    quiet: true,
    ledgerFile: path.join(tempDir, 'ledger.json'),
    accountsFile: path.join(tempDir, 'accounts.json'),
    walletConnection: fakeConnection,
  });
  const server = await new Promise((resolve) => {
    const s = realm.listen(() => resolve(s));
  });
  try {
    const port = server.address().port;
    const okRes = await postJson(port, '/api/wallet/devnet-ping', { publicKey: SYSTEM_PROGRAM });
    assert.strictEqual(okRes.status, 200);
    assert.strictEqual(okRes.body.method, 'signAndSendTransaction');
    assert(bs58ish.test(okRes.body.params.message), 'HTTP endpoint should return a Phantom bs58 message');

    const badRes = await postJson(port, '/api/wallet/devnet-ping', { publicKey: 'bad' });
    assert.strictEqual(badRes.status, 400);
    assert.strictEqual(badRes.body.error.code, 'invalid_wallet_public_key');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  ok('HTTP endpoint returns server-built wallet ping requests and typed validation errors');

  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert(html.includes('<script src="game/wallet.js"></script>'), 'index.html must load the wallet adapter before game code');
  assert(/id="walletConnect"/.test(html), 'wallet panel should expose a wallet connect control');
  assert(/id="walletPing"/.test(html), 'wallet panel should expose a devnet sign-and-send control');
  assert(/RUNECHAIN_WALLET\.createWalletManager/.test(html), 'game UI should use the adapter manager');
  assert(!/wBuy'\)\.onclick=\(\)=>\{ const g=Econ\.buyGoldWithSol/.test(html), 'Buy Gold must not remain hardwired to the old mock path');
  assert(!/window\.solana/.test(html), 'game UI must not scatter raw Phantom/window.solana calls outside game/wallet.js');
  ok('browser wallet panel is wired through game/wallet.js, not raw wallet SDK calls');

  console.log('\nwallet devnet transaction verification passed (' + pass + ' checks).');
})().catch((err) => { console.error(err); process.exit(1); });
