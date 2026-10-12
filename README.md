# Makketing Identity Hub

One identity for the Makketing suite. Visually aligned with [SocialPostAPI](https://socialpostapi.makketing.com).

Sign in with Google or X, connect sandbox profiles immediately, and turn on live platform OAuth once the host has keys. Product servers exchange a one-time code for a hub token. Platform tokens stay encrypted on the hub.

## Run

```bash
npm install
npm run dev
```

The app listens on port 8080. With no database URL it uses embedded Postgres. Set `DATABASE_URL` in production.

## What works before keys

- Workspace per signed-in owner
- Sandbox profiles for X, Instagram, Facebook, TikTok, LinkedIn, YouTube, and Reddit
- Grants per app, disconnect, and an activity log
- Sandbox widget (`mode: "sandbox"`) and the live consent redirect (`mode: "live"`)
- Pricing, docs, privacy, terms, and data deletion

Snapchat stays planned and is not a connector. Dark Suite is not registered.

## Host configuration

Set these on the host. Do not commit them.

| Purpose | Names |
|---|---|
| Encrypt platform tokens | `TOKEN_ENCRYPTION_KEY` |
| Public origin | `APP_ORIGIN` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_SCALE` |
| X | `X_CLIENT_ID`, `X_CLIENT_SECRET` |
| Instagram | `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET` |
| Facebook | `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` |
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` |
| YouTube | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` |
| Reddit | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` |

YouTube uses its own client pair so it does not collide with Google sign-in.

Register this callback on every platform:

```text
{APP_ORIGIN}/api/oauth/callback
```

Point the Stripe webhook at:

```text
{APP_ORIGIN}/api/stripe/webhook
```

Until `STRIPE_SECRET_KEY` is set, five live profiles can be connected so OAuth can be tested. After it is set, live profiles need an active plan: Starter $39 (5), Growth $129 (25), Scale $349 (100). Sandbox profiles do not count.

## Product exchange

The widget, in live mode, sends the person to `/connect`. Your server, not the browser, trades the code:

```bash
curl -X POST "$APP_ORIGIN/api/oauth/token" \
  -H "Content-Type: application/json" \
  -d '{"client_id":"ihub_pk_...","client_secret":"ihub_sk_...","code":"code_..."}'
```

`GET /api/oauth/introspect` with `Authorization: Bearer` returns the provider, handle, and scopes. It does not return the platform token.

SocialPostAPI and Makketing are registered on first sign-in. Copy each client secret in the workspace, then hide it. It is not shown again.
