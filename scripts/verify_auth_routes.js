/* HTTP-level test of the sign-in routes (/auth/google/start|callback, /auth/session, /auth/logout).
 * A mock Google OAuth is injected, so the redirect/state-cookie/session-cookie wiring is verified
 * over a real socket without contacting Google. */
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const serverApi = require(path.join(__dirname, '..', 'server.js'));

function request(port, method, p, headers) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: p, headers: headers || {} }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}
function cookieValue(setCookie, name) {
  for (const c of setCookie || []) {
    const m = c.match(new RegExp('^' + name + '=([^;]*)'));
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

const mockOAuth = {
  enabled: true,
  authUrl: ({ state }) => `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&state=${state}`,
  async exchangeCode(code) {
    return code === 'GOOD'
      ? { ok: true, profile: { provider: 'google', sub: 'sub-http', email: 'h@x.io', emailVerified: true, name: 'Http' } }
      : { ok: false, error: { code: 'token_exchange_failed', message: 'bad code' } };
  },
};

(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-routes-'));
  const realm = serverApi.createRealmServer({
    ledgerFile: path.join(tempDir, 'ledger.json'),
    accountsFile: path.join(tempDir, 'accounts.json'),
    seasonId: 'season-one', difficulty: 1, saveDelayMs: 0, quiet: true,
    googleOAuth: mockOAuth,
  });
  await new Promise((r) => realm.server.listen(0, '127.0.0.1', r));
  const port = realm.server.address().port;

  // helper: begin a flow, return the CSRF state + its cookie.
  async function startFlow() {
    const res = await request(port, 'GET', '/auth/google/start?next=/play');
    assert.strictEqual(res.status, 302);
    assert(res.headers.location.startsWith('https://accounts.google.com/'), 'redirects to Google');
    const state = cookieValue(res.headers['set-cookie'], 'rc_oauth_state');
    assert(state, 'state cookie set');
    assert(res.headers.location.includes('state=' + state), 'state threaded into the Google URL');
    return state;
  }

  // 1. start sets state cookie + redirects to Google.
  const state1 = await startFlow();

  // 2. callback with matching state + good code -> session cookie + redirect to next.
  const cb = await request(port, 'GET', `/auth/google/callback?code=GOOD&state=${state1}`, { Cookie: `rc_oauth_state=${state1}` });
  assert.strictEqual(cb.status, 302);
  assert.strictEqual(cb.headers.location, '/play', 'redirects to the sanitized next target');
  const sid = cookieValue(cb.headers['set-cookie'], 'rc_session');
  assert(sid, 'session cookie issued');
  assert((cb.headers['set-cookie'] || []).some((c) => /rc_session=.*HttpOnly/i.test(c)), 'session cookie is HttpOnly');

  // 3. /auth/session reflects the signed-in identity.
  const sess = JSON.parse((await request(port, 'GET', '/auth/session', { Cookie: `rc_session=${sid}` })).body);
  assert.strictEqual(sess.signedIn, true);
  assert.strictEqual(sess.sso.email, 'h@x.io');
  assert.strictEqual(sess.ssoEnabled, true);

  // 4. callback with a MISMATCHED state cookie -> rejected (CSRF guard).
  const state2 = await startFlow();
  const badState = await request(port, 'GET', `/auth/google/callback?code=GOOD&state=${state2}`, { Cookie: 'rc_oauth_state=WRONG' });
  assert.strictEqual(badState.headers.location, '/?auth=state_invalid', 'state mismatch rejected');

  // 5. callback with a bad code (token exchange fails) surfaces the error code.
  const state3 = await startFlow();
  const badCode = await request(port, 'GET', `/auth/google/callback?code=BAD&state=${state3}`, { Cookie: `rc_oauth_state=${state3}` });
  assert.strictEqual(badCode.headers.location, '/?auth=token_exchange_failed');

  // 6. state is single-use: replaying a consumed state fails.
  const replay = await request(port, 'GET', `/auth/google/callback?code=GOOD&state=${state1}`, { Cookie: `rc_oauth_state=${state1}` });
  assert.strictEqual(replay.headers.location, '/?auth=state_invalid', 'consumed state cannot be replayed');

  // 7. logout clears the session.
  const out = await request(port, 'POST', '/auth/logout', { Cookie: `rc_session=${sid}` });
  assert.strictEqual(out.status, 200);
  const afterOut = JSON.parse((await request(port, 'GET', '/auth/session', { Cookie: `rc_session=${sid}` })).body);
  assert.strictEqual(afterOut.signedIn, false, 'session destroyed after logout');

  realm.close();

  // 8. when SSO is unconfigured, /start degrades gracefully.
  const offRealm = serverApi.createRealmServer({
    ledgerFile: path.join(tempDir, 'l2.json'), accountsFile: path.join(tempDir, 'a2.json'),
    seasonId: 'season-one', difficulty: 1, saveDelayMs: 0, quiet: true,
    googleOAuth: { enabled: false, authUrl: () => '', exchangeCode: async () => ({ ok: false, error: { code: 'sso_disabled' } }) },
  });
  await new Promise((r) => offRealm.server.listen(0, '127.0.0.1', r));
  const offStart = await request(offRealm.server.address().port, 'GET', '/auth/google/start');
  assert.strictEqual(offStart.headers.location, '/?auth=sso_unconfigured');
  const offSess = JSON.parse((await request(offRealm.server.address().port, 'GET', '/auth/session')).body);
  assert.strictEqual(offSess.ssoEnabled, false);
  offRealm.close();

  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('auth routes verification passed (start/callback/session/logout + CSRF + single-use state)');
})().catch((err) => { console.error(err); process.exit(1); });
