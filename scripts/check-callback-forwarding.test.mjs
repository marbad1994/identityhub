import assert from "node:assert/strict";
import { test } from "node:test";
import { checkCallbackForwarding } from "./check-callback-forwarding.mjs";

const origin = "https://hub.example.com";
const callbackBase = "https://socialpost.example.com/api/connect";

test("callback check verifies both X and TikTok, including denied consent", async () => {
  const calls = [];
  await checkCallbackForwarding(origin, callbackBase, async (input, options) => {
    calls.push(input);
    assert.equal(options.redirect, "manual");
    const url = new URL(input);
    const platform = url.pathname.split("/")[3];
    return new Response(null, {
      status: 302,
      headers: { location: `${origin}/api/auth/callback/${platform}${url.search}` },
    });
  });
  assert.equal(calls.length, 4);
});

test("callback check rejects SocialPostAPI's own popup result page", async () => {
  await assert.rejects(
    checkCallbackForwarding(
      origin,
      callbackBase,
      async () =>
        new Response(null, {
          status: 307,
          headers: {
            location:
              "https://socialpost.example.com/connect/result?ok=0&message=Invalid+or+already-used+OAuth+state",
          },
        }),
    ),
    /Set IDENTITY_HUB_URL/,
  );
});

test("callback check rejects a different hub host or lost query parameters", async () => {
  for (const location of [
    "https://other.example.com/api/auth/callback/twitter",
    `${origin}/api/auth/callback/twitter`,
  ]) {
    await assert.rejects(
      checkCallbackForwarding(
        origin,
        callbackBase,
        async () =>
          new Response(null, {
            status: 302,
            headers: { location },
          }),
      ),
    );
  }
});
