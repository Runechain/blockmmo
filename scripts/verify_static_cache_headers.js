#!/usr/bin/env node
const assert = require('assert');
const serverApi = require('../server.js');

async function main() {
  const realm = serverApi.createRealmServer({
    announce: false,
    persistLedger: false,
    enableAuth: false,
    enableIdentity: false,
  });

  await new Promise((resolve) => realm.server.listen(0, '127.0.0.1', resolve));
  const { port } = realm.server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    for (const path of ['/', '/index.html', '/assets/pixel/knight.png']) {
      const res = await fetch(base + path);
      assert.strictEqual(res.status, 200, `${path} should be served`);
      assert.strictEqual(
        res.headers.get('cache-control'),
        'no-store',
        `${path} should not be cached between deploys`,
      );
    }
  } finally {
    await new Promise((resolve) => realm.close(resolve));
  }

  console.log('static cache headers verification passed');
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
