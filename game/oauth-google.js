/* RUNECHAIN Google SSO + session layer (sign-in flow, SSO leg).
 *
 * The SSO leg is the human-ish root + recovery anchor of the account (see game/identity.js). This
 * module is server-only and zero-dep: it brokers Google's OAuth 2.0 / OpenID Connect authorization-code
 * flow with `fetch` and validates the returned id_token via Google's tokeninfo endpoint — so there is
 * NO JWKS/RSA hand-rolling and NO library. `fetch` and `now` are injected so the whole flow is
 * unit-testable without hitting Google.
 *
 * Secrets (client id/secret) come from env, never the client. The browser only ever sees the redirect;
 * the code-for-token exchange and id_token validation happen here.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RUNECHAIN_OAUTH_GOOGLE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const nodeCrypto = (typeof require === 'function') ? require('crypto') : null;

  const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
  const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
  const TOKENINFO_ENDPOINT = 'https://oauth2.googleapis.com/tokeninfo';
  const VALID_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

  function randomToken(bytes) {
    return nodeCrypto ? nodeCrypto.randomBytes(bytes || 32).toString('hex') : String(Math.random()).slice(2);
  }

  // ---- cookies ------------------------------------------------------------------------------------
  function parseCookies(header) {
    const out = {};
    if (!header || typeof header !== 'string') return out;
    for (const part of header.split(';')) {
      const eq = part.indexOf('=');
      if (eq < 0) continue;
      const name = part.slice(0, eq).trim();
      if (!name) continue;
      out[name] = decodeURIComponent(part.slice(eq + 1).trim());
    }
    return out;
  }

  function serializeCookie(name, value, opts) {
    opts = opts || {};
    let s = `${name}=${encodeURIComponent(value)}`;
    s += `; Path=${opts.path || '/'}`;
    if (opts.maxAge != null) s += `; Max-Age=${Math.floor(opts.maxAge)}`;
    s += `; SameSite=${opts.sameSite || 'Lax'}`; // Lax: rides the top-level OAuth redirect back + same-origin WS upgrade
    if (opts.httpOnly !== false) s += '; HttpOnly';
    if (opts.secure) s += '; Secure';
    return s;
  }

  // ---- generic TTL stores (sessions + OAuth CSRF state) -------------------------------------------
  function createStore(opts) {
    opts = opts || {};
    const ttlMs = opts.ttlMs == null ? 30 * 60 * 1000 : opts.ttlMs;
    const now = typeof opts.now === 'function' ? opts.now : () => Date.now();
    const map = new Map();

    function sweep() {
      const t = now();
      for (const [k, v] of map) if (v.expiresAt <= t) map.delete(k);
    }
    return {
      create(data, idBytes) {
        sweep();
        const id = randomToken(idBytes || 32);
        map.set(id, { data, createdAt: now(), expiresAt: now() + ttlMs });
        return id;
      },
      get(id) {
        if (typeof id !== 'string' || !map.has(id)) return null;
        const entry = map.get(id);
        if (entry.expiresAt <= now()) { map.delete(id); return null; }
        return entry.data;
      },
      touch(id) {
        const entry = map.has(id) ? map.get(id) : null;
        if (entry && entry.expiresAt > now()) { entry.expiresAt = now() + ttlMs; return true; }
        return false;
      },
      take(id) { // one-time consume (used for OAuth state)
        const data = this.get(id);
        if (data != null) map.delete(id);
        return data;
      },
      destroy(id) { map.delete(id); },
      size() { sweep(); return map.size; },
    };
  }

  // ---- Google OAuth -------------------------------------------------------------------------------
  function createGoogleOAuth(config) {
    config = config || {};
    const clientId = config.clientId || null;
    const clientSecret = config.clientSecret || null;
    const redirectUri = config.redirectUri || null;
    const fetchImpl = config.fetch || (typeof fetch === 'function' ? fetch : null);
    const now = typeof config.now === 'function' ? config.now : () => Date.now();
    const enabled = !!(clientId && clientSecret && redirectUri);

    function authUrl(parts) {
      parts = parts || {};
      const q = new URLSearchParams({
        client_id: clientId || '',
        redirect_uri: redirectUri || '',
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'online',
        include_granted_scopes: 'true',
        prompt: parts.prompt || 'select_account',
        state: parts.state || '',
      });
      if (parts.nonce) q.set('nonce', parts.nonce);
      if (parts.loginHint) q.set('login_hint', parts.loginHint);
      return `${AUTH_ENDPOINT}?${q.toString()}`;
    }

    // Exchange an authorization code for tokens, then validate the id_token and return the SSO profile.
    async function exchangeCode(code) {
      if (!enabled) return { ok: false, error: { code: 'sso_disabled', message: 'Google SSO is not configured on this server.' } };
      if (!fetchImpl) return { ok: false, error: { code: 'sso_unavailable', message: 'No fetch implementation available for OAuth.' } };
      if (!code || typeof code !== 'string') return { ok: false, error: { code: 'invalid_code', message: 'Missing authorization code.' } };

      let tokenJson;
      try {
        const body = new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        });
        const res = await fetchImpl(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
          body: body.toString(),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          return { ok: false, error: { code: 'token_exchange_failed', message: `Google token exchange failed (HTTP ${res.status}). ${text.slice(0, 200)}` } };
        }
        tokenJson = await res.json();
      } catch (err) {
        return { ok: false, error: { code: 'token_exchange_error', message: String(err && err.message || err) } };
      }

      const idToken = tokenJson && tokenJson.id_token;
      if (!idToken) return { ok: false, error: { code: 'no_id_token', message: 'Google did not return an id_token.' } };
      return validateIdToken(idToken);
    }

    // Validate via Google's tokeninfo endpoint (zero-dep; no JWKS/RSA). Checks aud, iss, exp.
    async function validateIdToken(idToken) {
      let claims;
      try {
        const res = await fetchImpl(`${TOKENINFO_ENDPOINT}?id_token=${encodeURIComponent(idToken)}`, {
          headers: { accept: 'application/json' },
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          return { ok: false, error: { code: 'idtoken_invalid', message: `id_token validation failed (HTTP ${res.status}). ${text.slice(0, 200)}` } };
        }
        claims = await res.json();
      } catch (err) {
        return { ok: false, error: { code: 'idtoken_error', message: String(err && err.message || err) } };
      }

      if (!claims || typeof claims !== 'object') return { ok: false, error: { code: 'idtoken_malformed', message: 'id_token claims malformed.' } };
      if (claims.aud !== clientId) return { ok: false, error: { code: 'aud_mismatch', message: 'id_token audience does not match this client.' } };
      if (!VALID_ISSUERS.has(claims.iss)) return { ok: false, error: { code: 'iss_mismatch', message: 'id_token issuer is not Google.' } };
      const exp = Number(claims.exp) * 1000;
      if (Number.isFinite(exp) && exp <= now()) return { ok: false, error: { code: 'idtoken_expired', message: 'id_token is expired.' } };
      if (!claims.sub) return { ok: false, error: { code: 'no_subject', message: 'id_token has no subject.' } };

      return {
        ok: true,
        profile: {
          provider: 'google',
          sub: String(claims.sub),
          email: claims.email || null,
          emailVerified: claims.email_verified === true || claims.email_verified === 'true',
          name: claims.name || null,
        },
      };
    }

    return { enabled, clientId, redirectUri, authUrl, exchangeCode, validateIdToken };
  }

  return { createGoogleOAuth, createStore, parseCookies, serializeCookie };
});
