# Identity Hub

One login for the Makketing suite. People sign in with a social platform they already use, connect the other accounts they publish to, and choose which of those accounts each app (SocialPostAPI, Makketing, and later others) may use. Platform tokens stay encrypted on the hub; an app's server asks for one only when it needs to publish.

Supported: X, Instagram, Facebook (one account per Page), TikTok, LinkedIn, YouTube, Reddit, and Snapchat (sign-in only: Snap has no posting API, so Snapchat accounts only ever carry `profile`). The OAuth details per platform mirror SocialPostAPI's connectors.

## How it works

1. **Sign in** at `/login` with any configured platform. The first sign-in creates the user; that platform account is connected too.
2. **Connect** more accounts from `/workspace`. Connecting also lets that platform identity sign in to the same user.
3. **Authorize** an app at `/authorize`. The person picks accounts; the app gets a one-time code, exchanges it server-side for a long-lived app token, reads the person and granted accounts, and requests platform tokens for accounts granted `publish`.

## App API

Full walkthrough with examples: `/docs` on a running hub (`src/routes/docs.tsx`).

| Method and path | Auth | Purpose |
|---|---|---|
| `GET /authorize?client_id&redirect_uri&scope&state` | browser | Consent screen. `scope` is `profile`, `publish` or both. Redirects back with `code` and `state`, or `error=access_denied`. |
| `POST /api/v1/oauth/token` | client id and secret (body or Basic) | `grant_type=authorization_code`, `code`, `redirect_uri`. Returns `access_token`, `user`, `accounts`. Codes are single use, ten minutes. |
| `GET /api/v1/me` | `Bearer ihub_at_...` | The user and the accounts granted to this app. |
| `POST /api/v1/accounts/{id}/token` | `Bearer ihub_at_...` | Current platform access token for an account granted `publish`; refreshed first when it expires within five minutes. |
| `POST /api/v1/oauth/revoke` | client id and secret | `token=ihub_at_...`. |
| `GET /api/health` | none | Liveness plus a database round trip. |

Errors are `{ "error", "error_description" }`: `invalid_client` 401, `invalid_grant` 400, `unsupported_grant_type` 400, `invalid_token` 401, `insufficient_scope` 403, `not_found` 404, `reconnect_required` 409 (the platform refused a refresh; the person must reconnect the account).

App tokens do not expire. They stop working when the person removes the app in their workspace, deletes their account, the app revokes the token, or the app is deleted.

Apps are registered in the workspace ("Your apps") with exact redirect URIs. The client secret is shown once and stored as a SHA-256 hash.

## Configuration

| Purpose | Variables |
|---|---|
| Database | `DATABASE_URL` (Postgres) |
| Public origin | `APP_ORIGIN`, e.g. `https://identity.makketing.com` |
| Token encryption | `TOKEN_ENCRYPTION_KEY` (any long random string; AES-256-GCM key is derived from it) |
| Platforms | `TWITTER_`, `INSTAGRAM_`, `FACEBOOK_`, `TIKTOK_`, `LINKEDIN_`, `YOUTUBE_`, `REDDIT_`, `SNAPCHAT_` + `CLIENT_ID` / `CLIENT_SECRET` |
| Facebook Page picker (optional) | `FACEBOOK_LOGIN_CONFIG_ID` |

The platform variable names match SocialPostAPI's, so the same developer apps can serve both. A platform appears on the sign-in page once both of its values are set. Register this callback on each platform app, in addition to SocialPostAPI's own:

```text
{APP_ORIGIN}/api/auth/callback/{twitter|instagram|facebook|tiktok|linkedin|youtube|reddit|snapchat}
```

Use `{APP_ORIGIN}/deletion` as the data deletion URL and `{APP_ORIGIN}/privacy` as the privacy policy URL in each platform's app settings.

## Deploy (Docker)

The image is published to `ghcr.io/marbad1994/identityhub` by `.github/workflows/docker-publish.yml` on every push to `main`.

`docker-compose.yml` runs the hub and its own Postgres as the isolated project `identityhub`: its own network, volume and container names, and nothing on ports 80/443, so it does not touch other stacks on the host. The app listens on port 8316 on every interface, so it answers both at `http://<server-ip>:8316` and through the reverse proxy on its domain; set `IDENTITYHUB_BIND=127.0.0.1` to keep it proxy-only.

On the IP address, pages and the app API (`/api/v1/*`) work directly. Signing in always finishes on `APP_ORIGIN`: platforms only redirect to the registered https callback, and the session cookie is `Secure` when `APP_ORIGIN` is https, so a browser keeps it only on the domain. The container applies pending migrations on start.

```bash
cp .env.example .env
bash scripts/env-from-socialpostapi.sh /opt/socialpostapi/.env .env https://identity.makketing.com
vi .env
docker compose pull && docker compose up -d
```

`scripts/env-from-socialpostapi.sh` copies the platform credentials from SocialPostAPI's `.env` on the same host, generates `POSTGRES_PASSWORD` and `TOKEN_ENCRYPTION_KEY`, never overwrites a value that is already set, and prints names only.

Route a hostname to it from the host's existing reverse proxy, for example Makketing's Caddy:

```text
identity.makketing.com {
	reverse_proxy host.docker.internal:8316
}
```

If the package is private, run `docker login ghcr.io` on the server first.

## Develop

```bash
npm install
DATABASE_URL=postgres://... npm run db:migrate
DATABASE_URL=postgres://... APP_ORIGIN=http://localhost:8080 TOKEN_ENCRYPTION_KEY=dev npm run dev
```

Checks: `npm run typecheck`, `npm run lint`, `npm test`.

End-to-end test (run `npm run build` first): it wipes the given database, starts the built server with every platform faked (`scripts/e2e/mock-platforms.mjs`), and drives sign-in, connect, app registration, consent, code exchange, `/me`, platform-token refresh, revocation, a second user and data deletion in Chromium.

```bash
npm run build
E2E_DATABASE_URL=postgres://user:pass@127.0.0.1:5432/identityhub_e2e npm run test:e2e
```
