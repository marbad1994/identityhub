#!/usr/bin/env node
/**
 * End-to-end run of the whole product against a real Postgres and the built
 * server, driving the UI in Chromium. Platforms are faked by
 * ./mock-platforms.mjs (server side) and by browser routes (authorize pages).
 *
 *   npm run build
 *   E2E_DATABASE_URL=postgres://user:pass@127.0.0.1:5432/identityhub_e2e npm run test:e2e
 *
 * The database is wiped first. Set E2E_SCREENSHOTS=<dir> to save screenshots, and
 * E2E_CHROMIUM=<path> to use a Chromium other than Playwright's own download.
 */
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { chromium } from "playwright";

const DATABASE_URL = process.env.E2E_DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Set E2E_DATABASE_URL to a disposable Postgres database.");
  process.exit(2);
}
const PORT = 8316;
const HUB = `http://localhost:${PORT}`;
const APP_REDIRECT = "http://localhost:3472/callback";
const SHOTS = process.env.E2E_SCREENSHOTS;

const env = {
  ...process.env,
  DATABASE_URL,
  APP_ORIGIN: HUB,
  PORT: String(PORT),
  HOST: "127.0.0.1",
  TOKEN_ENCRYPTION_KEY: "e2e-key",
  NODE_ENV: "production",
};
for (const prefix of ["TWITTER", "INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "YOUTUBE", "REDDIT", "SNAPCHAT"]) {
  env[`${prefix}_CLIENT_ID`] = `${prefix.toLowerCase()}-client`;
  env[`${prefix}_CLIENT_SECRET`] = `${prefix.toLowerCase()}-secret`;
}

const db = new pg.Pool({ connectionString: DATABASE_URL });

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))));
  });
}

async function startServer() {
  const server = spawn("node", ["--import", "./scripts/e2e/mock-platforms.mjs", ".output/server/index.mjs"], { env, stdio: "inherit" });
  for (let i = 0; i < 50; i += 1) {
    try {
      if ((await fetch(`${HUB}/api/health`)).ok) return server;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  server.kill();
  throw new Error("Server did not become healthy");
}

/** Browser side of each platform: the authorize page bounces straight back with code=<person>. */
const AUTHORIZE_PAGES = {
  "twitter.com/i/oauth2/authorize": "twitter",
  "www.instagram.com/oauth/authorize": "instagram",
  "www.facebook.com/v21.0/dialog/oauth": "facebook",
  "www.tiktok.com/v2/auth/authorize/": "tiktok",
  "www.linkedin.com/oauth/v2/authorization": "linkedin",
  "accounts.google.com/o/oauth2/v2/auth": "youtube",
  "www.reddit.com/api/v1/authorize": "reddit",
  "accounts.snapchat.com/accounts/oauth2/auth": "snapchat",
};

async function newPerson(browser, person) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const captured = [];
  // Playwright does not route requests that follow a redirect, so intercept
  // the hub's own /api/auth/start, check the authorize URL it answers with,
  // and send the browser straight to the callback as the platform would.
  await context.route(`${HUB}/api/auth/start**`, async (route) => {
    const response = await route.fetch({ maxRedirects: 0 });
    const location = new URL(response.headers().location, HUB);
    const platform = AUTHORIZE_PAGES[`${location.host}${location.pathname}`];
    if (!platform) return route.fulfill({ response });
    assert.ok(location.searchParams.get("state"), `${platform} authorize URL has a state`);
    assert.equal(location.searchParams.get("redirect_uri"), `${HUB}/api/auth/callback/${platform}`);
    const back = `${HUB}/api/auth/callback/${platform}?code=${person}&state=${encodeURIComponent(location.searchParams.get("state"))}`;
    return route.fulfill({ status: 302, headers: { location: back } });
  });
  // Anything else external (web fonts) is not needed and may not be reachable.
  await context.route(/^https:\/\//, (route) => route.abort());
  await context.route(`${APP_REDIRECT}**`, (route) => {
    captured.push(new URL(route.request().url()));
    return route.fulfill({ status: 200, body: "app callback" });
  });
  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.accept());
  if (process.env.E2E_DEBUG) page.on("requestfailed", (request) => console.log("\n  request failed:", request.url(), request.failure()?.errorText));
  return { context, page, captured };
}

async function shot(page, name) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}

const api = (path, init = {}) => fetch(`${HUB}${path}`, init).then(async (response) => ({ status: response.status, body: await response.json() }));
const form = (values) => ({ method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(values) });

async function step(name, work) {
  process.stdout.write(`- ${name} ... `);
  await work();
  console.log("ok");
}

async function main() {
  await db.query("drop schema public cascade; create schema public;");
  await run("node", ["scripts/migrate.mjs"]);
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || undefined });
  try {
    const alice = await newPerson(browser, "alice");
    let app;
    let code;
    let aliceToken;

    await step("sign in with X creates a user and connects the account", async () => {
      await alice.page.goto(`${HUB}/login`);
      await alice.page.getByRole("link", { name: "Continue with X" }).click();
      await alice.page.waitForURL(`${HUB}/workspace`);
      await alice.page.getByRole("heading", { name: "alice on X" }).waitFor();
    });

    await step("connect every other platform (Facebook yields one account per Page)", async () => {
      for (const label of ["Instagram", "Facebook", "TikTok", "LinkedIn", "YouTube", "Reddit", "Snapchat"]) {
        await Promise.all([
          alice.page.waitForNavigation(),
          alice.page.getByRole("link", { name: `Connect ${label}` }).click(),
        ]);
        assert.equal(alice.page.url(), `${HUB}/workspace`, `connecting ${label}`);
      }
      for (const name of ["alice.ig", "alice Bakery", "alice Studio", "alice TikTok", "alice LinkedIn", "alice Channel", "alice Snap"]) {
        await alice.page.getByText(name, { exact: true }).first().waitFor();
      }
      const { rows } = await db.query("select count(*)::int as n from accounts");
      assert.equal(rows[0].n, 9);
      const tokens = await db.query("select access_token from accounts");
      assert.ok(tokens.rows.every((row) => !row.access_token.startsWith("at:")), "tokens are encrypted at rest");
      await shot(alice.page, "workspace");
    });

    await step("register an app and see its secret once", async () => {
      await alice.page.getByRole("button", { name: "Register an app" }).click();
      await alice.page.getByLabel("Name").fill("SocialPostAPI");
      await alice.page.getByLabel("Homepage URL").fill("https://socialpostapi.makketing.com");
      await alice.page.getByLabel("Redirect URIs, one per line").fill(APP_REDIRECT);
      await alice.page.getByRole("button", { name: "Register app" }).click();
      await alice.page.getByText("Copy the client secret now").waitFor();
      const values = await alice.page.locator("dd").allInnerTexts();
      app = { clientId: values[0].trim(), clientSecret: values[1].trim() };
      assert.match(app.clientId, /^ihub_pk_/);
      assert.match(app.clientSecret, /^ihub_sk_/);
      await alice.page.getByRole("button", { name: "I saved it" }).click();
    });

    const authorizeUrl = (state, redirect = APP_REDIRECT) =>
      `${HUB}/authorize?${new URLSearchParams({ client_id: app.clientId, redirect_uri: redirect, scope: "profile publish", state })}`;

    await step("consent screen rejects an unregistered redirect_uri without redirecting", async () => {
      await alice.page.goto(authorizeUrl("x", "https://evil.example/cb"));
      await alice.page.getByText("This sign-in link is not valid").waitFor();
    });

    await step("person picks accounts and allows; app receives code and state", async () => {
      await alice.page.goto(authorizeUrl("state-1"));
      await alice.page.getByRole("heading", { name: "SocialPostAPI wants to use your accounts" }).waitFor();
      await shot(alice.page, "consent");
      await alice.page.getByRole("checkbox", { name: /alice Studio/ }).uncheck();
      await alice.page.getByRole("button", { name: "Allow" }).click();
      await alice.page.waitForURL(`${APP_REDIRECT}**`);
      const back = alice.captured.at(-1);
      assert.equal(back.searchParams.get("state"), "state-1");
      code = back.searchParams.get("code");
      assert.match(code, /^code_/);
    });

    await step("app exchanges the code; wrong secret and code reuse are refused", async () => {
      const bad = await api("/api/v1/oauth/token", form({ grant_type: "authorization_code", code, redirect_uri: APP_REDIRECT, client_id: app.clientId, client_secret: "wrong" }));
      assert.equal(bad.status, 401);
      assert.equal(bad.body.error, "invalid_client");
      const basic = Buffer.from(`${app.clientId}:${app.clientSecret}`).toString("base64");
      const ok = await api("/api/v1/oauth/token", {
        ...form({ grant_type: "authorization_code", code, redirect_uri: APP_REDIRECT }),
        headers: { "content-type": "application/x-www-form-urlencoded", authorization: `Basic ${basic}` },
      });
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      aliceToken = ok.body.access_token;
      assert.equal(ok.body.user.display_name, "alice on X");
      assert.equal(ok.body.accounts.length, 8, "Studio page was left out");
      assert.ok(!ok.body.accounts.some((a) => a.display_name === "alice Studio"));
      assert.deepEqual(ok.body.accounts.find((a) => a.platform === "snapchat").scopes, ["profile"]);
      const reuse = await api("/api/v1/oauth/token", form({ code, redirect_uri: APP_REDIRECT, client_id: app.clientId, client_secret: app.clientSecret }));
      assert.equal(reuse.body.error, "invalid_grant");
    });

    const bearer = (token) => ({ headers: { authorization: `Bearer ${token}` } });
    const accountByPlatform = async (token, platform) => (await api("/api/v1/me", bearer(token))).body.accounts.find((a) => a.platform === platform);

    await step("/me returns the granted accounts", async () => {
      const me = await api("/api/v1/me", bearer(aliceToken));
      assert.equal(me.status, 200);
      assert.equal(me.body.accounts.length, 8);
      assert.equal((await api("/api/v1/me", bearer("ihub_at_nope"))).status, 401);
    });

    await step("platform token for a Facebook Page; Snapchat is refused (profile only)", async () => {
      const page = (await api("/api/v1/me", bearer(aliceToken))).body.accounts.find((a) => a.display_name === "alice Bakery");
      const result = await api(`/api/v1/accounts/${page.id}/token`, { method: "POST", ...bearer(aliceToken) });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.match(result.body.access_token, /^at:facebook-page:alice:/);
      assert.equal(result.body.platform_account_id, "page1-alice");
      const snap = await accountByPlatform(aliceToken, "snapchat");
      const refused = await api(`/api/v1/accounts/${snap.id}/token`, { method: "POST", ...bearer(aliceToken) });
      assert.equal(refused.status, 403);
      assert.equal(refused.body.error, "insufficient_scope");
    });

    await step("an expiring X token is refreshed and stored", async () => {
      const x = await accountByPlatform(aliceToken, "twitter");
      const first = await api(`/api/v1/accounts/${x.id}/token`, { method: "POST", ...bearer(aliceToken) });
      await db.query("update accounts set token_expires_at = now() - interval '1 minute' where id = $1", [x.id]);
      const refreshed = await api(`/api/v1/accounts/${x.id}/token`, { method: "POST", ...bearer(aliceToken) });
      assert.equal(refreshed.status, 200, JSON.stringify(refreshed.body));
      assert.notEqual(refreshed.body.access_token, first.body.access_token);
      assert.ok(new Date(refreshed.body.expires_at).getTime() > Date.now());
      const again = await api(`/api/v1/accounts/${x.id}/token`, { method: "POST", ...bearer(aliceToken) });
      assert.equal(again.body.access_token, refreshed.body.access_token);
    });

    const bob = await newPerson(browser, "bob");
    await step("a second person signs in, sees only their data, and can deny or allow the same app", async () => {
      await bob.page.goto(authorizeUrl("bob-1"));
      await bob.page.getByRole("link", { name: "Continue with Reddit" }).click();
      await bob.page.getByRole("heading", { name: "SocialPostAPI wants to use your accounts" }).waitFor();
      await bob.page.getByRole("button", { name: "Deny" }).click();
      await bob.page.waitForURL(`${APP_REDIRECT}**`);
      assert.equal(bob.captured.at(-1).searchParams.get("error"), "access_denied");
      assert.equal(bob.captured.at(-1).searchParams.get("state"), "bob-1");

      await bob.page.goto(authorizeUrl("bob-2"));
      await bob.page.getByRole("button", { name: "Allow" }).click();
      await bob.page.waitForURL(`${APP_REDIRECT}**`);
      const exchanged = await api(
        "/api/v1/oauth/token",
        form({ code: bob.captured.at(-1).searchParams.get("code"), redirect_uri: APP_REDIRECT, client_id: app.clientId, client_secret: app.clientSecret }),
      );
      assert.equal(exchanged.status, 200);
      assert.equal(exchanged.body.user.display_name, "bob");
      assert.deepEqual(exchanged.body.accounts.map((a) => a.handle), ["u/bob"]);

      await bob.page.goto(`${HUB}/workspace`);
      assert.equal(await bob.page.getByText("alice", { exact: false }).count(), 0);
    });

    await step("removing the app in the workspace revokes its token", async () => {
      await alice.page.goto(`${HUB}/workspace`);
      await alice.page.getByRole("button", { name: "Remove access" }).click();
      await alice.page.getByText("No app has access yet.").waitFor();
      assert.equal((await api("/api/v1/me", bearer(aliceToken))).status, 401);
    });

    await step("sign out, then sign in with Facebook reaches the same user", async () => {
      await alice.page.getByRole("button", { name: "Sign out" }).first().click();
      await alice.page.waitForURL(`${HUB}/`);
      await alice.page.getByRole("link", { name: "Sign in" }).first().waitFor();
      await alice.page.goto(`${HUB}/login`);
      await alice.page.getByRole("link", { name: "Continue with Facebook" }).click();
      await alice.page.waitForURL(`${HUB}/workspace`);
      await alice.page.getByText("alice.ig", { exact: true }).waitFor();
      const { rows } = await db.query("select count(*)::int as n from users");
      assert.equal(rows[0].n, 2);
    });

    await step("data deletion removes the person and everything they own", async () => {
      await alice.page.goto(`${HUB}/deletion`);
      await alice.page.getByRole("button", { name: "Delete my account and data" }).click();
      await alice.page.getByText("Your data was deleted.").waitFor();
      const users = await db.query("select display_name from users");
      assert.deepEqual(users.rows.map((r) => r.display_name), ["bob"]);
      const leftovers = await db.query("select (select count(*) from accounts)::int as a, (select count(*) from apps)::int as p");
      assert.deepEqual(leftovers.rows[0], { a: 1, p: 0 });
    });

    console.log("\nE2E passed.");
  } finally {
    await browser.close();
    server.kill();
    await db.end();
  }
}

main().catch((error) => {
  console.error("\nE2E failed:", error);
  process.exit(1);
});
