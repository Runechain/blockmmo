const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const { createRealmServer } = require('../server.js');
const PREVIEW_DISCLAIMER = 'The Gameplay is meant to demonstrate progress being made by an experimental Distributed Agentic Work Grid, and does not represent the final experience';

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'runechain-landing-'));
  const mailingListFile = path.join(tmp, 'waitlist.csv');
  const previousToken = process.env.WAITLIST_EXPORT_TOKEN;
  const previousPreviewUrl = process.env.RUNECHAIN_PREVIEW_URL;
  process.env.WAITLIST_EXPORT_TOKEN = 'test-export-token';
  process.env.RUNECHAIN_PREVIEW_URL = 'http://preview.example.test:8080';

  const realm = createRealmServer({
    port: 0,
    ledgerFile: path.join(tmp, 'ledger.json'),
    accountsFile: path.join(tmp, 'accounts.json'),
    mailingListFile,
    quiet: true,
    saveDelayMs: 0,
  });

  try {
    await new Promise((resolve) => realm.listen(resolve));
    const baseUrl = `http://127.0.0.1:${realm.server.address().port}`;

    const landing = await fetchText(`${baseUrl}/`);
    assert.match(landing.body, /<form[^>]+id="mailing-list"/, 'home route should serve the lander signup form');
    assert.match(landing.body, /RUNECHAIN/, 'home route should include the RUNECHAIN brand');
    assert.match(landing.body, /Preview Play/, 'home route should expose the AWS preview CTA');
    assert.match(landing.body, /Live Build, no saves/, 'home route should label the preview as unsaved live build');
    assert.match(landing.body, new RegExp(PREVIEW_DISCLAIMER), 'home route should explain the preview build context');
    assert.match(landing.body, /href="\/preview-play"/, 'home route should route preview through Vercel');
    assert.doesNotMatch(landing.body, /href="\/play"/, 'home route should not link to the playable game');

    const preview = await fetch(`${baseUrl}/preview-play`, { redirect: 'manual' });
    assert.strictEqual(preview.status, 302, 'preview route should redirect to the configured live build');
    assert.strictEqual(preview.headers.get('location'), 'http://preview.example.test:8080', 'preview route should point at AWS preview URL');

    const play = await fetchText(`${baseUrl}/play`);
    assert.match(play.body, /Coming Soon/, 'play route should return a coming-soon page');
    assert.doesNotMatch(play.body, /<canvas id="c"/, 'play route should not serve the game canvas publicly');

    const directIndex = await fetchText(`${baseUrl}/index.html`);
    assert.match(directIndex.body, /Coming Soon/, 'direct index.html route should return a coming-soon page');
    assert.doesNotMatch(directIndex.body, /<canvas id="c"/, 'direct index.html route should not expose the game canvas');

    const accepted = await fetch(`${baseUrl}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'Recorded@Example.COM',
        name: 'The Recorded',
        note: 'Send parish updates',
        source: 'test-suite',
      }),
    });
    assert.strictEqual(accepted.status, 201, 'valid signup should be accepted');
    assert.deepStrictEqual(await accepted.json(), { ok: true }, 'signup response should be minimal JSON');

    const csv = fs.readFileSync(mailingListFile, 'utf8').trim().split('\n');
    assert.strictEqual(csv.length, 2, 'CSV should contain one header row and one signup row');
    assert.strictEqual(csv[0], 'created_at,email,source,name,note,ip_hash', 'CSV should have stable export headers');
    assert.match(csv[1], /recorded@example\.com/, 'CSV should normalize email to lowercase');
    assert.match(csv[1], /The Recorded/, 'CSV should include optional display name');

    const rejected = await fetch(`${baseUrl}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    assert.strictEqual(rejected.status, 400, 'invalid email should be rejected');

    const denied = await fetch(`${baseUrl}/api/waitlist.csv`);
    assert.strictEqual(denied.status, 403, 'CSV export should require the configured token');

    const exported = await fetchText(`${baseUrl}/api/waitlist.csv?token=test-export-token`);
    assert.strictEqual(exported.status, 200, 'CSV export should succeed with the configured token');
    assert.match(exported.body, /^created_at,email,source,name,note,ip_hash\n/, 'CSV export should return CSV content');

    await verifyVercelAdapter(tmp);
    verifyVercelDoesNotBundleGame();
  } finally {
    await new Promise((resolve) => realm.close(resolve));
    if (previousToken == null) delete process.env.WAITLIST_EXPORT_TOKEN;
    else process.env.WAITLIST_EXPORT_TOKEN = previousToken;
    if (previousPreviewUrl == null) delete process.env.RUNECHAIN_PREVIEW_URL;
    else process.env.RUNECHAIN_PREVIEW_URL = previousPreviewUrl;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function verifyVercelDoesNotBundleGame() {
  const apiSource = fs.readFileSync(path.join(__dirname, '..', 'api', 'index.js'), 'utf8');
  assert.doesNotMatch(apiSource, /require\(['"]\.\.\/server\.js['"]\)/, 'Vercel adapter must not import the game realm server');
  assert.doesNotMatch(apiSource, /require\(['"]\.\.\/game\//, 'Vercel adapter must not import game modules');

  const vercelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
  const includeFiles = String(vercelConfig.functions['api/index.js'].includeFiles || '');
  assert.doesNotMatch(includeFiles, /index\.html/, 'Vercel function bundle must not include the playable game shell');
  assert.doesNotMatch(includeFiles, /game\/\*\*/, 'Vercel function bundle must not include game modules');
  assert.doesNotMatch(includeFiles, /engine\/\*\*/, 'Vercel function bundle must not include game engines');
  assert.doesNotMatch(includeFiles, /assets\/pixel\/\*\*/, 'Vercel function bundle must not include game pixel assets');

  const vercelIgnore = fs.readFileSync(path.join(__dirname, '..', '.vercelignore'), 'utf8');
  for (const pattern of ['server.js', 'index.html', 'game/', 'engine/', 'assets/pixel/']) {
    assert.match(vercelIgnore, new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'm'), `.vercelignore must exclude ${pattern}`);
  }
}

async function verifyVercelAdapter(tmp) {
  const mailingListFile = path.join(tmp, 'adapter-waitlist.csv');
  const previousCsv = process.env.RUNECHAIN_WAITLIST_CSV;
  process.env.RUNECHAIN_WAITLIST_CSV = mailingListFile;

  try {
    const adapterPath = require.resolve('../api/index.js');
    delete require.cache[adapterPath];
    const adapter = require(adapterPath);
    const server = http.createServer((req, res) => adapter(req, res));

    await new Promise((resolve) => server.listen(0, resolve));
    try {
      const baseUrl = `http://127.0.0.1:${server.address().port}`;
      const landing = await fetchText(`${baseUrl}/api/index.js?path=`);
      assert.match(landing.body, /<form[^>]+id="mailing-list"/, 'Vercel adapter should route root to the lander');
      assert.match(landing.body, /Preview Play/, 'Vercel adapter lander should expose the AWS preview CTA');
      assert.match(landing.body, /Live Build, no saves/, 'Vercel adapter lander should label the preview as unsaved live build');
      assert.match(landing.body, new RegExp(PREVIEW_DISCLAIMER), 'Vercel adapter lander should explain the preview build context');
      assert.match(landing.body, /href="\/preview-play"/, 'Vercel adapter lander should route preview through Vercel');
      assert.doesNotMatch(landing.body, /href="\/play"/, 'Vercel adapter lander should not link to the playable game');

      const preview = await fetch(`${baseUrl}/api/index.js?path=preview-play`, { redirect: 'manual' });
      assert.strictEqual(preview.status, 302, 'Vercel adapter preview route should redirect to the configured live build');
      assert.strictEqual(preview.headers.get('location'), 'http://preview.example.test:8080', 'Vercel adapter preview route should point at AWS preview URL');

      const play = await fetchText(`${baseUrl}/api/index.js?path=play`);
      assert.match(play.body, /Coming Soon/, 'Vercel adapter should route /play to coming soon');
      assert.doesNotMatch(play.body, /<canvas id="c"/, 'Vercel adapter should not expose the game canvas');

      const directIndex = await fetchText(`${baseUrl}/api/index.js?path=index.html`);
      assert.match(directIndex.body, /Coming Soon/, 'Vercel adapter should block direct index.html access');
      assert.doesNotMatch(directIndex.body, /<canvas id="c"/, 'Vercel adapter direct index.html should not expose the game canvas');

      const accepted = await fetch(`${baseUrl}/api/index.js?path=api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'adapter@example.com', source: 'adapter-test' }),
      });
      assert.strictEqual(accepted.status, 201, 'Vercel adapter should preserve POST signup routing');
      assert.match(fs.readFileSync(mailingListFile, 'utf8'), /adapter@example\.com/, 'adapter signup should write CSV data');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    if (previousCsv == null) delete process.env.RUNECHAIN_WAITLIST_CSV;
    else process.env.RUNECHAIN_WAITLIST_CSV = previousCsv;
  }
}

async function fetchText(url) {
  const response = await fetch(url);
  return { status: response.status, body: await response.text() };
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
