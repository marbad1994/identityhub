import assert from "node:assert/strict";
import { test } from "node:test";
import { pendingMigrations } from "./migration-plan.mjs";

test("pending migrations are the unapplied .sql files in name order", () => {
  assert.deepEqual(
    pendingMigrations(["0003_c.sql", "0001_a.sql", "README.md", "0002_b.sql"], ["0001_a.sql"]),
    ["0002_b.sql", "0003_c.sql"],
  );
});

test("nothing is pending once everything is applied", () => {
  assert.deepEqual(pendingMigrations(["0001_a.sql"], ["0001_a.sql"]), []);
});
