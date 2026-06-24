# Sign-in (Google SSO) — production setup

The game's sign-in flow has three legs: device key (always on), **Google SSO**, and a
Solana wallet. This doc covers wiring the Google SSO leg for production at
**https://play.runechaingame.com**.

Rollout is **gate-off-first**: deploy the auth routes with enforcement *off* so existing
players are unaffected, verify the Google round-trip on the real domain, then flip
enforcement on. See [the flip step](#6-flip-enforcement-on-when-ready).

---

## How config reaches the server

- **Production (ECS Fargate):** env comes from `.aws/task-definition.json`. Public values
  live in `environment`; secrets live in `secrets` as `valueFrom` → SSM Parameter Store.
- **Local dev:** `server.js` auto-loads a gitignored `.env` (see `.env.example`).

The server reads: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`,
`RUNECHAIN_SECURE_COOKIES`, `RUNECHAIN_REQUIRE_IDENTITY`. With no client id/secret,
`/auth/session` reports `ssoEnabled:false` and the in-game gate stays hidden.

---

## 1. Create the Google OAuth client  *(owner: you — your Google account)*

At https://console.cloud.google.com/apis/credentials → **Create Credentials → OAuth client ID**:

- Application type: **Web application**
- **Authorized redirect URI** (must match exactly):
  `https://play.runechaingame.com/auth/google/callback`
- **Authorized JavaScript origin:** `https://play.runechaingame.com`
- On the **OAuth consent screen**, add your account under **Test users** (or publish the app).
  Scopes are the defaults `openid email profile` — nothing sensitive, no Google review needed.

Copy the **Client ID** and **Client Secret**.

> To also test locally, add a second redirect URI `http://localhost:8080/auth/google/callback`
> to the same client. One client can hold both.

## 2. Store the credentials in SSM Parameter Store  *(owner: AWS — needs `aws login`)*

```bash
aws ssm put-parameter --region ca-west-1 --type SecureString \
  --name /runechain/prod/GOOGLE_CLIENT_ID     --value "<client-id>"
aws ssm put-parameter --region ca-west-1 --type SecureString \
  --name /runechain/prod/GOOGLE_CLIENT_SECRET --value "<client-secret>"
# add --overwrite to rotate later
```

## 3. Let the task execution role read them

Attach this to `arn:aws:iam::901889466248:role/ecsTaskExecutionRole`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameters"],
      "Resource": [
        "arn:aws:ssm:ca-west-1:901889466248:parameter/runechain/prod/GOOGLE_CLIENT_ID",
        "arn:aws:ssm:ca-west-1:901889466248:parameter/runechain/prod/GOOGLE_CLIENT_SECRET"
      ]
    }
  ]
}
```

SecureString uses the AWS-managed `alias/aws/ssm` key, so no extra `kms:Decrypt` is needed.
If you switch to a customer-managed KMS key, also grant `kms:Decrypt` on that key.

## 4. Task definition (already wired)

`.aws/task-definition.json` already references the two SSM params via `secrets` and sets
`GOOGLE_REDIRECT_URI` + `RUNECHAIN_SECURE_COOKIES=1`. `RUNECHAIN_REQUIRE_IDENTITY` is
**intentionally absent** (gate-off-first rollout).

## 5. Deploy

Merge `feat/identity-signin` → `main`. The GitHub Actions pipeline builds the image and
updates the ECS service. After it settles:

```bash
curl -s https://play.runechaingame.com/auth/session         # expect ssoEnabled:true
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  https://play.runechaingame.com/auth/google/start            # expect 302 -> accounts.google.com/...
```

Then open https://play.runechaingame.com, click **Sign in with Google**, complete consent,
and confirm you land back signed in (`/auth/session` shows your email).

> The gate UI itself only appears once enforcement is on (step 6); until then sign-in is
> exercisable via the endpoints above and the session cookie is issued correctly.

## 6. Flip enforcement on (when ready)

Add to `.aws/task-definition.json` → container `environment`:

```json
{ "name": "RUNECHAIN_REQUIRE_IDENTITY", "value": "1" }
```

Merge to `main` to deploy. Now every join requires Google SSO **and** a connected Solana
wallet, and the in-game sign-in gate is shown. Roll back by removing the var and redeploying.
