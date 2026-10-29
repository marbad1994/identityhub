import assert from "node:assert/strict";
import { test } from "node:test";
import { google } from "./google.ts";
import { callbackUrl, credentials } from "./index.ts";
import { platformInfo } from "../../lib/platforms.ts";

const creds = { clientId: "test-client", clientSecret: "test-secret" };
const redirectUri = "https://identityhub.makketing.com/api/auth/google/callback";

test("Google requests identity only, with PKCE and a one-time state", () => {
  const url = new URL(
    google.authorizeUrl({ creds, redirectUri, state: "random-state", challenge: "challenge" }),
  );
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("scope"), "openid profile");
  assert.equal(url.searchParams.get("redirect_uri"), redirectUri);
  assert.equal(url.searchParams.get("state"), "random-state");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("code_challenge"), "challenge");
  assert.equal(url.searchParams.has("access_type"), false);
  assert.equal(platformInfo("google")?.identityOnly, true);
  assert.deepEqual(platformInfo("google")?.scopes, []);
});

test("Google reuses the YouTube client while its callback stays direct and exact", () => {
  const keys = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "YOUTUBE_CLIENT_ID",
    "YOUTUBE_CLIENT_SECRET",
    "APP_ORIGIN",
    "PLATFORM_CALLBACK_BASE",
  ];
  const previous = keys.map((key) => process.env[key]);
  try {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    process.env.YOUTUBE_CLIENT_ID = creds.clientId;
    process.env.YOUTUBE_CLIENT_SECRET = creds.clientSecret;
    process.env.APP_ORIGIN = "https://identityhub.makketing.com";
    process.env.PLATFORM_CALLBACK_BASE = "https://socialpostapi.makketing.com/api/connect";
    assert.deepEqual(credentials(google), creds);
    assert.equal(callbackUrl("google"), redirectUri);
    assert.equal(
      callbackUrl("youtube"),
      "https://socialpostapi.makketing.com/api/connect/youtube/callback",
    );
    process.env.GOOGLE_CLIENT_ID = "dedicated-client";
    assert.equal(credentials(google), null, "Partial configuration does not mix clients");
    process.env.GOOGLE_CLIENT_SECRET = "dedicated-secret";
    assert.deepEqual(credentials(google), {
      clientId: "dedicated-client",
      clientSecret: "dedicated-secret",
    });
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
});

test("Google exchanges the code server-side, reads the stable subject and discards tokens", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request, init?: RequestInit) => {
    calls += 1;
    if (calls === 1) {
      assert.equal(url, "https://oauth2.googleapis.com/token");
      const body = init?.body as URLSearchParams;
      assert.equal(body.get("code_verifier"), "verifier");
      assert.equal(body.get("redirect_uri"), redirectUri);
      assert.equal(body.get("client_secret"), creds.clientSecret);
      return Response.json({ access_token: "secret-access-token", id_token: "untrusted-unused" });
    }
    assert.equal(url, "https://openidconnect.googleapis.com/v1/userinfo");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer secret-access-token");
    return Response.json({
      sub: "stable-google-id",
      name: "Example Person",
      email: "not-an-identifier@example.com",
      picture: "https://example.com/avatar.png",
    });
  });
  const login = await google.exchange({ creds, code: "code", redirectUri, verifier: "verifier" });
  assert.deepEqual(login, {
    subject: {
      id: "stable-google-id",
      displayName: "Example Person",
      avatarUrl: "https://example.com/avatar.png",
    },
    accounts: [],
  });
  assert.equal(calls, 2);
});

test("Google refuses a missing access token or invalid profile subject", async (t) => {
  const input = { creds, code: "code", redirectUri, verifier: "verifier" };
  t.mock.method(globalThis, "fetch", async () => Response.json({}));
  await assert.rejects(google.exchange(input), /access token/);
  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request) =>
    Response.json(String(url).endsWith("/token") ? { access_token: "token" } : { sub: 42 }),
  );
  await assert.rejects(google.exchange(input), /valid identity/);
});
