import assert from "node:assert/strict";
import { test } from "node:test";
import type { Queryable } from "./db.ts";
import { listAppGrants } from "./workspace.ts";

function client(answer: (sql: string) => unknown[]): Queryable {
  return {
    async query(text) {
      return { rows: answer(text) };
    },
  } as Queryable;
}

test("a non-owner is not found rather than an empty snapshot", async () => {
  const sql: string[] = [];
  const result = await listAppGrants(
    "owner",
    "app",
    client((text) => {
      sql.push(text);
      return [];
    }),
  );
  assert.equal(result, null);
  assert.match(sql[0] ?? "", /owner_id/);
});

test("an owner with no rows gets an empty snapshot", async () => {
  const result = await listAppGrants(
    "owner",
    "app",
    client((text) => {
      if (text.includes("owner_id")) return [{ id: "app" }];
      assert.match(text, /union all/);
      return [];
    }),
  );
  assert.deepEqual(result, []);
});

test("an owner sees a grant row", async () => {
  const result = await listAppGrants(
    "owner",
    "app",
    client((text) => {
      if (text.includes("owner_id")) return [{ id: "app" }];
      assert.match(text, /union all/);
      return [
        {
          kind: "grant",
          at: new Date("2026-01-02T00:00:00Z"),
          display_name: "alice",
          provider: "twitter",
          handle: "alice",
          scopes: "profile",
          used: true,
        },
      ];
    }),
  );
  assert.equal(result?.[0]?.kind, "grant");
  assert.equal(result?.[0]?.displayName, "alice");
  assert.equal(result?.[0]?.handle, "alice");
  assert.equal(result?.[0]?.used, true);
});
