/* Unit tests for game/oauth-google.js — the SSO leg. Uses a mock fetch + injected clock, so the
 * full authorization-code flow (authUrl -> token exchange -> id_token validation -> profile) and the
 * session/state/cookie helpers are verified without ever contacting Google. */
const assert = require('assert');
const path = require('path');

const oauth = require(path.join(__dirname, '..', 'game', 'oauth-google.js'));

let passed = 0;
function ok(label) { passed++; if (process.env.VERBOSE) console.log('  ok -', label); }

function jsonResponse(obj, status) {
  return { ok: (status || 200) < 400, status: status || 200, json: async () => obj, text: async () => JSON.stringify(obj) };
}
function errorResponse(status, text) {
  return { ok: false, status, json: async () => ({}), text: async () => text || '' };
}

// A mock fetch that routes token + tokeninfo calls. `claims` is what tokeninfo returns.
function makeFetch(opts) {
  opts = opts || {};
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    // tokeninfo first — it shares the '/token' prefix, so order matters.
    if (url.startsWith('https://oauth2.googleapis.com/tokeninfo')) {
      if (opts.tokeninfoStatus && opts.tokeninfoStatus >= 400) return errorResponse(opts.tokeninfoStatus, 'invalid');
      return jsonResponse(opts.claims || {});
    }
    if (url.startsWith('https://oauth2.googleapis.com/token')) {
      if (opts.tokenStatus && opts.tokenStatus >= 400) return errorResponse(opts.tokenStatus, 'bad_token');
      return jsonResponse({ id_token: opts.idToken || 'IDTOKEN', access_token: 'AT' });
    }
    throw new Error('unexpected fetch ' + url);
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

(async () => {
  // ---- cookies -----------------------------------------------------------------------------------
  {
    const c = oauth.parseCookies('rc_session=abc%20123; rc_oauth_state=xyz; junk');
    assert.strictEqual(c.rc_session, 'abc 123');
    assert.strictEqual(c.rc_oauth_state, 'xyz');
    assert.deepStrictEqual(oauth.parseCookies(''), {});
    assert.deepStrictEqual(oauth.parseCookies(undefined), {});

    const set = oauth.serializeCookie('rc_session', 'v1', { maxAge: 600, secure: true });
    assert(set.includes('rc_session=v1') && set.includes('HttpOnly') && set.includes('SameSite=Lax'));
    assert(set.includes('Secure') && set.includes('Max-Age=600'));
    assert(oauth.serializeCookie('rc_session', '', { maxAge: 0 }).includes('Max-Age=0'));
    ok('cookie parse + serialize');
  }

  // ---- TTL store ---------------------------------------------------------------------------------
  {
    let t = 1000;
    const store = oauth.createStore({ ttlMs: 100, now: () => t });
    const sid = store.create({ user: 'a' });
    assert.deepStrictEqual(store.get(sid), { user: 'a' });
    t = 1099; assert.deepStrictEqual(store.get(sid), { user: 'a' });
    t = 1101; assert.strictEqual(store.get(sid), null, 'expired');
    t = 2000;
    const s2 = store.create({ user: 'b' });
    assert.deepStrictEqual(store.take(s2), { user: 'b' });
    assert.strictEqual(store.get(s2), null, 'take() consumes');
    const s3 = store.create({ user: 'c' }); store.destroy(s3);
    assert.strictEqual(store.get(s3), null);
    ok('TTL store create/get/take/destroy/expiry');
  }

  // ---- disabled when unconfigured ----------------------------------------------------------------
  {
    const off = oauth.createGoogleOAuth({});
    assert.strictEqual(off.enabled, false);
    const r = await off.exchangeCode('x');
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.error.code, 'sso_disabled');
    ok('disabled config rejects exchange');
  }

  const baseCfg = { clientId: 'CID.apps.googleusercontent.com', clientSecret: 'SECRET', redirectUri: 'https://play.example/auth/google/callback', now: () => 1_000_000 };

  // ---- authUrl shape -----------------------------------------------------------------------------
  {
    const g = oauth.createGoogleOAuth(baseCfg);
    assert.strictEqual(g.enabled, true);
    const url = g.authUrl({ state: 'STATE123', nonce: 'N1' });
    assert(url.startsWith('https://accounts.google.com/o/oauth2/v2/auth?'));
    const q = new URL(url).searchParams;
    assert.strictEqual(q.get('client_id'), baseCfg.clientId);
    assert.strictEqual(q.get('redirect_uri'), baseCfg.redirectUri);
    assert.strictEqual(q.get('response_type'), 'code');
    assert.strictEqual(q.get('scope'), 'openid email profile');
    assert.strictEqual(q.get('state'), 'STATE123');
    assert.strictEqual(q.get('nonce'), 'N1');
    ok('authUrl carries client_id/redirect/scope/state/nonce');
  }

  // ---- happy path: code -> token -> tokeninfo -> profile -----------------------------------------
  {
    const fetchImpl = makeFetch({ claims: { aud: baseCfg.clientId, iss: 'accounts.google.com', sub: '11223344', email: 'p@x.io', email_verified: true, name: 'Pat', exp: 1001 } });
    const g = oauth.createGoogleOAuth({ ...baseCfg, fetch: fetchImpl });
    const r = await g.exchangeCode('AUTHCODE');
    assert.strictEqual(r.ok, true, JSON.stringify(r));
    assert.deepStrictEqual(r.profile, { provider: 'google', sub: '11223344', email: 'p@x.io', emailVerified: true, name: 'Pat' });
    // token request was form-encoded and carried the secret + code.
    const tokenCall = fetchImpl.calls.find((c) => c.url.startsWith('https://oauth2.googleapis.com/token'));
    assert(tokenCall.init.body.includes('code=AUTHCODE') && tokenCall.init.body.includes('grant_type=authorization_code'));
    ok('happy path returns validated google profile');
  }

  // ---- aud mismatch rejected ---------------------------------------------------------------------
  {
    const fetchImpl = makeFetch({ claims: { aud: 'SOMEONE-ELSE', iss: 'accounts.google.com', sub: 's', exp: 1001 } });
    const g = oauth.createGoogleOAuth({ ...baseCfg, fetch: fetchImpl });
    const r = await g.exchangeCode('c');
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.error.code, 'aud_mismatch');
    ok('audience mismatch rejected');
  }

  // ---- issuer mismatch + expiry ------------------------------------------------------------------
  {
    let g = oauth.createGoogleOAuth({ ...baseCfg, fetch: makeFetch({ claims: { aud: baseCfg.clientId, iss: 'evil.example', sub: 's', exp: 1001 } }) });
    assert.strictEqual((await g.exchangeCode('c')).error.code, 'iss_mismatch');

    g = oauth.createGoogleOAuth({ ...baseCfg, fetch: makeFetch({ claims: { aud: baseCfg.clientId, iss: 'accounts.google.com', sub: 's', exp: 999 } }) });
    assert.strictEqual((await g.exchangeCode('c')).error.code, 'idtoken_expired', 'exp 999s*1000 < now 1_000_000ms');
    ok('issuer mismatch + expired id_token rejected');
  }

  // ---- upstream HTTP failures --------------------------------------------------------------------
  {
    let g = oauth.createGoogleOAuth({ ...baseCfg, fetch: makeFetch({ tokenStatus: 400 }) });
    assert.strictEqual((await g.exchangeCode('c')).error.code, 'token_exchange_failed');

    g = oauth.createGoogleOAuth({ ...baseCfg, fetch: makeFetch({ tokeninfoStatus: 400 }) });
    assert.strictEqual((await g.exchangeCode('c')).error.code, 'idtoken_invalid');
    ok('token + tokeninfo HTTP failures surfaced');
  }

  console.log(`google oauth verification passed (${passed} groups)`);
})().catch((err) => { console.error(err); process.exit(1); });
