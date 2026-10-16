import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalAuthUrl } from "./auth-origin.ts";

const origin = "https://identityhub.example.com";

test("IP login and popup start move to the cookie host with query parameters intact", () => {
  for (const path of [
    "/login?return_to=%2Fapps%3Ftab%3Dmine",
    "/api/auth/start?platform=twitter&intent=login&return_to=%2Fworkspace&relay=abc",
    "/api/auth/callback/twitter?code=code&state=ihub_st_state",
    "/api/auth/verify-email?token=token",
    "/authorize?client_id=client&redirect_uri=https%3A%2F%2Fapp.example%2Fcallback&relay=abc",
    "/apps/my-app",
  ]) {
    assert.equal(
      canonicalAuthUrl(new Request(`http://84.247.181.21:8316${path}`), origin),
      `${origin}${path}`,
    );
  }
});

test("canonical HTTPS and proxied HTTPS do not redirect in a loop", () => {
  assert.equal(canonicalAuthUrl(new Request(`${origin}/login`), origin), null);
  assert.equal(
    canonicalAuthUrl(
      new Request("http://container:8080/login", {
        headers: { host: "identityhub.example.com", "x-forwarded-proto": "https" },
      }),
      origin,
    ),
    null,
  );
  assert.equal(
    canonicalAuthUrl(new Request("http://identityhub.example.com/login"), origin),
    `${origin}/login`,
  );
});

test("public API, relay polling, assets and POST requests stay on their requested host", () => {
  for (const path of [
    "/api/health",
    "/api/v1/relay/abc",
    "/api/v1/widget/client",
    "/widget.js",
    "/docs",
  ]) {
    assert.equal(canonicalAuthUrl(new Request(`http://84.247.181.21:8316${path}`), origin), null);
  }
  assert.equal(
    canonicalAuthUrl(
      new Request("http://84.247.181.21:8316/api/auth/logout", { method: "POST" }),
      origin,
    ),
    null,
  );
});

test("local HTTP development stays on its configured origin", () => {
  assert.equal(
    canonicalAuthUrl(new Request("http://localhost:8080/login"), "http://localhost:8080"),
    null,
  );
});
