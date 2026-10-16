import assert from "node:assert/strict";
import { test } from "node:test";
import { waitForRelay } from "./popup.ts";

test("a closed popup enables retry after a grace period while the relay can still finish", async (t) => {
  let now = 0;
  let requests = 0;
  let notices = 0;
  t.mock.method(Date, "now", () => now);
  t.mock.method(globalThis, "setTimeout", (callback: () => void) => {
    now += 1000;
    queueMicrotask(callback);
    return 0;
  });
  t.mock.method(globalThis, "fetch", async () => {
    requests += 1;
    return Response.json(
      requests >= 8
        ? { status: "done", location: "https://hub.example.com/workspace" }
        : { status: "pending" },
    );
  });
  const result = await waitForRelay("relay", new AbortController().signal, {
    window: { closed: true },
    onUnavailable: () => {
      assert.ok(now >= 5000);
      notices += 1;
    },
  });
  assert.equal(result, "https://hub.example.com/workspace");
  assert.equal(notices, 1);
  assert.equal(requests, 8);
});

test("a cancelled attempt cannot navigate using a late relay response", async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async () => {
    controller.abort();
    return Response.json({ status: "done", location: "/workspace" });
  });
  assert.equal(await waitForRelay("relay", controller.signal), null);
});

test("a timed-out relay releases the waiting page", async (t) => {
  let now = 0;
  t.mock.method(Date, "now", () => now);
  t.mock.method(globalThis, "setTimeout", (callback: () => void) => {
    now += 15 * 60 * 1000;
    queueMicrotask(callback);
    return 0;
  });
  t.mock.method(globalThis, "fetch", async () => Response.json({ status: "pending" }));
  assert.equal(await waitForRelay("relay", new AbortController().signal), null);
});
