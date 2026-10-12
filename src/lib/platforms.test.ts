import assert from "node:assert/strict";
import { test } from "node:test";
import { parseScopes, platformInfo, validRedirectUri } from "./platforms.ts";

test("parseScopes keeps known scopes once, in order, from space or comma lists", () => {
  assert.deepEqual(parseScopes("publish profile publish"), ["publish", "profile"]);
  assert.deepEqual(parseScopes("profile,admin"), ["profile"]);
  assert.deepEqual(parseScopes(undefined), []);
});

test("Snapchat can only grant profile", () => {
  assert.deepEqual(platformInfo("snapchat")?.scopes, ["profile"]);
  assert.equal(platformInfo("myspace"), undefined);
});

test("validRedirectUri accepts https and local http only", () => {
  assert.ok(validRedirectUri("https://socialpostapi.makketing.com/auth/callback?x=1"));
  assert.ok(validRedirectUri("http://localhost:3472/callback"));
  assert.ok(!validRedirectUri("http://socialpostapi.makketing.com/callback"));
  assert.ok(!validRedirectUri("https://example.com/cb#frag"));
  assert.ok(!validRedirectUri("https://user:pass@example.com/cb"));
  assert.ok(!validRedirectUri("javascript:alert(1)"));
});
