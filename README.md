# Identity Hub

One login for the Makketing suite. People sign in with a social platform they already use or with an email and password, connect the other accounts they publish to, and choose which of those accounts each app (SocialPostAPI, Makketing, and later others) may use. Platform tokens stay encrypted on the hub; an app's server asks for one only when it needs to publish.

Supported: X, Instagram, Facebook (one account per Page), TikTok, LinkedIn, YouTube, Reddit, and Snapchat (sign-in only: Snap has no posting API, so Snapchat accounts only ever carry `profile`). The OAuth details per platform mirror SocialPostAPI's connectors.

## How it works

1. **Sign in** at `/login` with any configured platform, or with email and password (`/signup`, confirmed by an emailed link). The first platform sign-in creates the user and connects that account. People who started with a platform can add an email and password in `/settings`, and turn on authenticator-app two-factor there.
2. **Connect** more accounts from `/workspace`. Connecting also lets that platform identity sign in to the same user.
3. **Platform sign-in runs in a popup** that closes itself when done; the page then moves on. The popup reports back through a single-use relay (`/api/v1/relay/{id}`) that the page polls, so it works even when a platform's page cuts the popup's link to its opener. With popups blocked, sign-in falls back to a full-page redirect.
4. **Choose sign-in methods and copy the widget** for each app at `/apps/{id}`: tick platforms and email/password, pick a theme, watch the live preview, copy the snippet. The widget fetches its settings from the hub, so later changes need no code change.
5. **Authorize** an app at `/authorize`. The widget opens it in a popup and, when the person is done, sends the host page to the app's redirect URI with `code` and `state`. The person picks accounts; the app gets a one-time code, exchanges it server-side for a long-lived app token, reads the person and granted accounts, and requests platform tokens for accounts granted `publish`.

## App API

Full walkthrough with examples: `/docs` on a running hub (`src/routes/docs.tsx`).

| Method and path | Auth | Purpose |
|---|---|---|
| `GET /authorize?client_id&redirect_uri&scope&state[&method]` | browser | Sign-in and consent, limited to the app's chosen methods. `scope` is `profile`, `publish` or both; `method` (a platform id or `password`) skips the method choice. Redirects back with `code` and `state`, or `error=access_denied`. |
| `GET /widget.js` | none | The embeddable sign-in widget. See the snippet on each app's page. |
| `GET /api/v1/relay/{id}` | none (CORS `*`) | Polled by a page while its sign-in popup is open: `pending`, then once `{"status":"done","location"}`. |
| `GET /api/v1/widget/{client_id}` | none (CORS `*`) | The widget's live config: app name, theme, sign-in methods. |
| `POST /api/v1/oauth/token` | client id and secret (body or Basic) | `grant_type=authorization_code`, `code`, `redirect_uri`. Returns `access_token`, `user` (`id`, `display_name`, `avatar_url`, `email`, which is null for platform-only people and otherwise confirmed), `accounts` (may be empty). Codes are single use, ten minutes. |
| `GET /api/v1/me` | `Bearer ihub_at_...` | The user and the accounts granted to this app. |
| `POST /api/v1/accounts/{id}/token` | `Bearer ihub_at_...` | Current platform access token for an account granted `publish`; refreshed first when it expires within five minutes. |
| `POST /api/v1/oauth/revoke` | client id and secret | `token=ihub_at_...`. |
| `GET /api/health` | none | Liveness plus a database round trip. |

Errors are `{ "error", "error_description" }`: `invalid_client` 401, `invalid_grant` 400, `unsupported_grant_type` 400, `invalid_token` 401, `insufficient_scope` 403, `not_found` 404, `reconnect_required` 409 (the platform refused a refresh; the person must reconnect the account).

App tokens do not expire. They stop working when the person removes the app in their workspace, deletes their account, the app revokes the token, or the app is deleted.

Apps are registered under Apps with exact redirect URIs. The client secret is shown once and stored as a SHA-256 hash.

## Configuration

| Purpose | Variables |
|---|---|
| Database | `DATABASE_URL` (Postgres) |
| Public origin | `APP_ORIGIN`, e.g. `https://identity.makketing.com` |
| Token encryption | `TOKEN_ENCRYPTION_KEY` (any long random string; AES-256-GCM key is derived from it) |
| Platforms | `TWITTER_`, `INSTAGRAM_`, `FACEBOOK_`, `TIKTOK_`, `LINKEDIN_`, `YOUTUBE_`, `REDDIT_`, `SNAPCHAT_` + `CLIENT_ID` / `CLIENT_SECRET` |
| Facebook Page picker (optional) | `FACEBOOK_LOGIN_CONFIG_ID` |
| Email (sign-up, reset, security notices) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_USE_TLS` (same names as SocialPostAPI). Email and password sign-in is offered only once `SMTP_HOST` and `SMTP_FROM_EMAIL` are set. |
| Reuse SocialPostAPI's callbacks (optional) | `PLATFORM_CALLBACK_BASE`, e.g. `https://socialpostapi.makketing.com/api/connect` |
| Rate-limit client IPs (optional) | `TRUSTED_PROXIES`: proxies whose `X-Forwarded-For` is believed. Defaults to loopback and private ranges, which covers Caddy reaching the hub over Docker. |

The platform variable names match SocialPostAPI's, so the same developer apps serve both. A platform appears on the sign-in page once both of its values are set.

**No new redirect URIs needed.** With `PLATFORM_CALLBACK_BASE=https://socialpostapi.makketing.com/api/connect`, the hub sends platforms SocialPostAPI's already-registered callback (`{base}/{platform}/callback`). The hub marks its OAuth states with the prefix `ihub_st_`; SocialPostAPI, with `IDENTITY_HUB_URL` set in its `.env`, forwards those callbacks unchanged to `{APP_ORIGIN}/api/auth/callback/{platform}`, and the hub exchanges the code with the same redirect URI. Without `PLATFORM_CALLBACK_BASE`, register `{APP_ORIGIN}/api/auth/callback/{platform}` on each platform instead. Snapchat is not in SocialPostAPI; register whichever callback the hub uses on its Snap Kit app.

Use `{APP_ORIGIN}/deletion` as the data deletion URL and `{APP_ORIGIN}/privacy` as the privacy policy URL in each platform's app settings.

## Security

Email and password accounts follow NIST SP 800-63B-4 and the OWASP authentication, password storage, session and CSRF cheat sheets:

- **Passwords**: 15 to 256 characters, no composition rules, Unicode NFKC-normalized, nothing truncated. Refused when found in Have I Been Pwned (k-anonymity range API with padding; only a 5-character SHA-1 prefix leaves the server; the check fails open if the service is down) or when built from the person's name, email or this service's name. Stored as Argon2id (19 MiB, 2 iterations, 1 lane, 16-byte salt), upgraded on sign-in if the parameters ever rise.
- **No account enumeration**: sign-up, sign-in and reset give the same answer for registered and unknown addresses, and an unknown address costs the same hashing work. Sign-up creates nothing until the mailbox owner clicks the link, so addresses cannot be squatted; a second sign-up for a registered address emails its owner instead.
- **Brute force**: per-IP and per-address fixed windows in Postgres (shared by every process); the per-address lock lasts 15 minutes, so it cannot lock anyone out for long. Client IPs come from `X-Forwarded-For` only when the direct peer is a trusted proxy, so the public port cannot spoof them.
- **Two-factor**: RFC 6238 TOTP (authenticator apps) with replay protection and ten single-use recovery codes, all stored encrypted or hashed. Sensitive changes (turning two-factor off, new recovery codes, deleting the account) require the current password.
- **Email links**: 32 random bytes, stored as SHA-256, single use; sign-up links expire in 24 hours, reset links in 30 minutes. A reset ends every session; a password change ends every other session; both, and two-factor changes, email the owner.
- **Sessions**: a new random token per sign-in, stored hashed, in a `__Host-` cookie (HttpOnly, Secure, SameSite=Lax) on https; 7-day idle and 30-day absolute timeouts; "sign out everywhere else" in settings.
- **Browser**: per-request nonce Content-Security-Policy with `strict-dynamic`, `frame-ancestors 'none'`, HSTS on https, `nosniff`, a strict referrer policy, COOP, CORP and `no-store` on pages. Server functions and the sign-out form are CSRF-checked (Sec-Fetch-Site, then Origin). Fonts are self-hosted.
- **Popups and relay**: relay ids are 32 random bytes made by the opening page, stored only as hashes, single read, 15-minute lifetime. The widget only follows a result that points at its own redirect URI.
- **Widget**: passwords are never typed on the host site; every widget button opens the hub (in a popup). The widget sets a random `state` in the `ihub_state` cookie on the host site, which the app's callback must compare with the returned `state`.

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

End-to-end test (run `npm run build` first): it wipes the given database, starts the built server with every platform and the breach API faked (`scripts/e2e/mock-platforms.mjs`) and email written to a file, and drives in Chromium: platform sign-in and connect, app registration, consent, code exchange, `/me`, platform-token refresh, a second user, security headers and CSRF, email sign-up with breached and personal passwords refused, enumeration-safe answers, the per-address lock, password reset ending sessions, two-factor with codes and recovery codes, the widget builder and the copied widget signing someone in from another site, revocation and data deletion. It fails on any CSP violation or script error.

```bash
npm run build
E2E_DATABASE_URL=postgres://user:pass@127.0.0.1:5432/identityhub_e2e npm run test:e2e
```
