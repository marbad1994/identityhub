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
import { createHmac } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
const MAIL_FILE = join(tmpdir(), `identityhub-e2e-mail-${process.pid}.jsonl`);

const env = {
  ...process.env,
  DATABASE_URL,
  APP_ORIGIN: HUB,
  PORT: String(PORT),
  HOST: "127.0.0.1",
  TOKEN_ENCRYPTION_KEY: "e2e-key",
  NODE_ENV: "production",
  // Outgoing email is written here instead of being sent.
  MAIL_FILE,
};
for (const prefix of [
  "TWITTER",
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "LINKEDIN",
  "YOUTUBE",
  "REDDIT",
  "SNAPCHAT",
]) {
  env[`${prefix}_CLIENT_ID`] = `${prefix.toLowerCase()}-client`;
  env[`${prefix}_CLIENT_SECRET`] = `${prefix.toLowerCase()}-secret`;
}

const db = new pg.Pool({ connectionString: DATABASE_URL });

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: "inherit" });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)),
    );
  });
}

async function startServer() {
  const server = spawn(
    "node",
    ["--import", "./scripts/e2e/mock-platforms.mjs", ".output/server/index.mjs"],
    { env, stdio: "inherit" },
  );
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
  // Any CSP violation or script error on a hub page fails the run.
  page.on("console", (message) => {
    if (message.type() === "error" && message.location().url.startsWith(HUB))
      consoleErrors.push(`${page.url()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => consoleErrors.push(`${page.url()}: ${error.message}`));
  if (process.env.E2E_DEBUG)
    page.on("requestfailed", (request) =>
      console.log("\n  request failed:", request.url(), request.failure()?.errorText),
    );
  return { context, page, captured };
}

const consoleErrors = [];

/** Every email the hub sent to `to`, oldest first. */
function mailTo(to) {
  let text = "";
  try {
    text = readFileSync(MAIL_FILE, "utf8");
  } catch {
    return [];
  }
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((mail) => mail.to === to);
}

/** RFC 6238 code for a base32 secret at `offsetSteps` from now. */
function totp(secret, offsetSteps = 0) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of secret) {
    value = (value << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offsetSteps));
  const hmac = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 15;
  return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, "0");
}

async function shot(page, name) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}

const api = (path, init = {}) =>
  fetch(`${HUB}${path}`, init).then(async (response) => ({
    status: response.status,
    body: await response.json(),
  }));
const form = (values) => ({
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(values),
});

async function step(name, work) {
  process.stdout.write(`- ${name} ... `);
  await work();
  console.log("ok");
}

async function main() {
  await db.query("drop schema public cascade; create schema public;");
  writeFileSync(MAIL_FILE, "");
  await run("node", ["scripts/migrate.mjs"]);
  const server = await startServer();
  const browser = await chromium.launch({
    executablePath: process.env.E2E_CHROMIUM || undefined,
    // The test "third-party site" is served by Playwright on localhost, so
    // Chromium would hold its requests to the hub behind a Local Network
    // Access prompt. A real site and a public hub are never in that situation.
    args: ["--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessPermissionPrompt"],
  });
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
      for (const label of [
        "Instagram",
        "Facebook",
        "TikTok",
        "LinkedIn",
        "YouTube",
        "Reddit",
        "Snapchat",
      ]) {
        await Promise.all([
          alice.page.waitForNavigation(),
          alice.page.getByRole("link", { name: `Connect ${label}` }).click(),
        ]);
        assert.equal(alice.page.url(), `${HUB}/workspace`, `connecting ${label}`);
      }
      for (const name of [
        "alice.ig",
        "alice Bakery",
        "alice Studio",
        "alice TikTok",
        "alice LinkedIn",
        "alice Channel",
        "alice Snap",
      ]) {
        await alice.page.getByText(name, { exact: true }).first().waitFor();
      }
      const { rows } = await db.query("select count(*)::int as n from accounts");
      assert.equal(rows[0].n, 9);
      const tokens = await db.query("select access_token from accounts");
      assert.ok(
        tokens.rows.every((row) => !row.access_token.startsWith("at:")),
        "tokens are encrypted at rest",
      );
      await shot(alice.page, "workspace");
    });

    await step("register an app and see its secret once", async () => {
      await alice.page.goto(`${HUB}/apps`);
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
      await alice.page.waitForURL(`${HUB}/apps/**`);
      await alice.page.getByRole("heading", { name: "Sign-in widget" }).waitFor();
      await alice.page.getByRole("button", { name: "Continue with Facebook" }).waitFor();
      app.builderUrl = alice.page.url();
    });

    const authorizeUrl = (state, redirect = APP_REDIRECT) =>
      `${HUB}/authorize?${new URLSearchParams({ client_id: app.clientId, redirect_uri: redirect, scope: "profile publish", state })}`;

    await step(
      "consent screen rejects an unregistered redirect_uri without redirecting",
      async () => {
        await alice.page.goto(authorizeUrl("x", "https://evil.example/cb"));
        await alice.page.getByText("This sign-in link is not valid").waitFor();
      },
    );

    await step("person picks accounts and allows; app receives code and state", async () => {
      await alice.page.goto(authorizeUrl("state-1"));
      await alice.page.getByRole("heading", { name: "Sign in to SocialPostAPI" }).waitFor();
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
      const bad = await api(
        "/api/v1/oauth/token",
        form({
          grant_type: "authorization_code",
          code,
          redirect_uri: APP_REDIRECT,
          client_id: app.clientId,
          client_secret: "wrong",
        }),
      );
      assert.equal(bad.status, 401);
      assert.equal(bad.body.error, "invalid_client");
      const basic = Buffer.from(`${app.clientId}:${app.clientSecret}`).toString("base64");
      const ok = await api("/api/v1/oauth/token", {
        ...form({ grant_type: "authorization_code", code, redirect_uri: APP_REDIRECT }),
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: `Basic ${basic}`,
        },
      });
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      aliceToken = ok.body.access_token;
      assert.equal(ok.body.user.display_name, "alice on X");
      assert.equal(ok.body.accounts.length, 8, "Studio page was left out");
      assert.ok(!ok.body.accounts.some((a) => a.display_name === "alice Studio"));
      assert.deepEqual(ok.body.accounts.find((a) => a.platform === "snapchat").scopes, ["profile"]);
      const reuse = await api(
        "/api/v1/oauth/token",
        form({
          code,
          redirect_uri: APP_REDIRECT,
          client_id: app.clientId,
          client_secret: app.clientSecret,
        }),
      );
      assert.equal(reuse.body.error, "invalid_grant");
    });

    const bearer = (token) => ({ headers: { authorization: `Bearer ${token}` } });
    const accountByPlatform = async (token, platform) =>
      (await api("/api/v1/me", bearer(token))).body.accounts.find((a) => a.platform === platform);

    await step("/me returns the granted accounts", async () => {
      const me = await api("/api/v1/me", bearer(aliceToken));
      assert.equal(me.status, 200);
      assert.equal(me.body.accounts.length, 8);
      assert.equal((await api("/api/v1/me", bearer("ihub_at_nope"))).status, 401);
    });

    await step(
      "platform token for a Facebook Page; Snapchat is refused (profile only)",
      async () => {
        const page = (await api("/api/v1/me", bearer(aliceToken))).body.accounts.find(
          (a) => a.display_name === "alice Bakery",
        );
        const result = await api(`/api/v1/accounts/${page.id}/token`, {
          method: "POST",
          ...bearer(aliceToken),
        });
        assert.equal(result.status, 200, JSON.stringify(result.body));
        assert.match(result.body.access_token, /^at:facebook-page:alice:/);
        assert.equal(result.body.platform_account_id, "page1-alice");
        const snap = await accountByPlatform(aliceToken, "snapchat");
        const refused = await api(`/api/v1/accounts/${snap.id}/token`, {
          method: "POST",
          ...bearer(aliceToken),
        });
        assert.equal(refused.status, 403);
        assert.equal(refused.body.error, "insufficient_scope");
      },
    );

    await step("an expiring X token is refreshed and stored", async () => {
      const x = await accountByPlatform(aliceToken, "twitter");
      const first = await api(`/api/v1/accounts/${x.id}/token`, {
        method: "POST",
        ...bearer(aliceToken),
      });
      await db.query(
        "update accounts set token_expires_at = now() - interval '1 minute' where id = $1",
        [x.id],
      );
      const refreshed = await api(`/api/v1/accounts/${x.id}/token`, {
        method: "POST",
        ...bearer(aliceToken),
      });
      assert.equal(refreshed.status, 200, JSON.stringify(refreshed.body));
      assert.notEqual(refreshed.body.access_token, first.body.access_token);
      assert.ok(new Date(refreshed.body.expires_at).getTime() > Date.now());
      const again = await api(`/api/v1/accounts/${x.id}/token`, {
        method: "POST",
        ...bearer(aliceToken),
      });
      assert.equal(again.body.access_token, refreshed.body.access_token);
    });

    const bob = await newPerson(browser, "bob");
    await step(
      "a second person signs in, sees only their data, and can deny or allow the same app",
      async () => {
        await bob.page.goto(authorizeUrl("bob-1"));
        await bob.page.getByRole("link", { name: "Continue with Reddit" }).click();
        await bob.page.getByRole("heading", { name: "Sign in to SocialPostAPI" }).waitFor();
        await bob.page.getByRole("button", { name: "Deny" }).click();
        await bob.page.waitForURL(`${APP_REDIRECT}**`);
        assert.equal(bob.captured.at(-1).searchParams.get("error"), "access_denied");
        assert.equal(bob.captured.at(-1).searchParams.get("state"), "bob-1");

        await bob.page.goto(authorizeUrl("bob-2"));
        await bob.page.getByRole("button", { name: "Allow" }).click();
        await bob.page.waitForURL(`${APP_REDIRECT}**`);
        const exchanged = await api(
          "/api/v1/oauth/token",
          form({
            code: bob.captured.at(-1).searchParams.get("code"),
            redirect_uri: APP_REDIRECT,
            client_id: app.clientId,
            client_secret: app.clientSecret,
          }),
        );
        assert.equal(exchanged.status, 200);
        assert.equal(exchanged.body.user.display_name, "bob");
        assert.deepEqual(
          exchanged.body.accounts.map((a) => a.handle),
          ["u/bob"],
        );

        await bob.page.goto(`${HUB}/workspace`);
        assert.equal(await bob.page.getByText("alice", { exact: false }).count(), 0);
      },
    );

    await step("security headers on pages; cross-site form posts are refused", async () => {
      const response = await fetch(`${HUB}/login`);
      const csp = response.headers.get("content-security-policy") ?? "";
      const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
      assert.ok(nonce, "CSP has a nonce");
      assert.match(csp, /frame-ancestors 'none'/);
      assert.match(csp, /object-src 'none'/);
      assert.ok(
        (await response.text()).includes(`nonce="${nonce}"`),
        "inline scripts carry the nonce",
      );
      assert.equal(response.headers.get("x-frame-options"), "DENY");
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.equal(response.headers.get("cache-control"), "no-store");
      const second = await fetch(`${HUB}/login`);
      assert.notEqual(
        /'nonce-([^']+)'/.exec(second.headers.get("content-security-policy"))[1],
        nonce,
        "fresh nonce per request",
      );
      const forged = await fetch(`${HUB}/api/auth/logout`, {
        method: "POST",
        redirect: "manual",
        headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
      });
      assert.equal(forged.status, 403);
    });

    const CAROL = "carol@example.com";
    let carolPassword = "violet tractor mountain lamp";
    const carol = await newPerson(browser, "carol");
    const mallory = await newPerson(browser, "mallory");
    const serverFnDone = (page) =>
      page.waitForResponse(
        (r) => r.url().includes("/_serverFn/") && r.request().method() === "POST",
      );

    await step(
      "email sign-up: breached and personal passwords refused, account created only from the emailed link",
      async () => {
        await carol.page.goto(`${HUB}/signup`);
        await carol.page.getByLabel("Name").fill("Carol Example");
        await carol.page.getByLabel("Email").fill(CAROL);
        const password = carol.page.getByLabel("Password", { exact: true });
        await password.fill("correct horse battery staple");
        await carol.page.getByRole("button", { name: "Create account" }).click();
        await carol.page.getByText("appeared in a data breach").waitFor();
        await password.fill("my name is carol and that is fine");
        await carol.page.getByRole("button", { name: "Create account" }).click();
        await carol.page.getByText("Do not use your name, email").waitFor();
        await password.fill(carolPassword);
        await carol.page.getByRole("button", { name: "Create account" }).click();
        await carol.page.getByText("Check your email.").waitFor();
        const before = await db.query(
          "select count(*)::int as n from users where email_normalized = $1",
          [CAROL],
        );
        assert.equal(before.rows[0].n, 0, "no account before the link is clicked");
        const confirm = mailTo(CAROL).at(-1);
        assert.equal(confirm.subject, "Confirm your email for Identity Hub");
        await carol.page.goto(confirm.link);
        await carol.page.waitForURL(`${HUB}/workspace`);
        await carol.page.getByRole("heading", { name: "Carol Example" }).waitFor();
        const stored = await db.query(
          "select password_hash from users where email_normalized = $1",
          [CAROL],
        );
        assert.match(stored.rows[0].password_hash, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
        await carol.page.goto(confirm.link);
        await carol.page.getByText("That link expired or was already used.").waitFor();
      },
    );

    await step(
      "sign-up with a registered address answers the same and only emails the owner",
      async () => {
        await mallory.page.goto(`${HUB}/signup`);
        await mallory.page.getByLabel("Name").fill("Mallory");
        await mallory.page.getByLabel("Email").fill(CAROL);
        await mallory.page
          .getByLabel("Password", { exact: true })
          .fill("totally different long phrase");
        await mallory.page.getByRole("button", { name: "Create account" }).click();
        await mallory.page.getByText("Check your email. If the address can be used").waitFor();
        assert.equal(mailTo(CAROL).at(-1).subject, "You already have an Identity Hub account");
        const users = await db.query(
          "select count(*)::int as n from users where email_normalized = $1",
          [CAROL],
        );
        assert.equal(users.rows[0].n, 1);
      },
    );

    const passwordLogin = async (person, email, password) => {
      await person.page.goto(`${HUB}/login`);
      await person.page.getByLabel("Email").fill(email);
      await person.page.getByLabel("Password", { exact: true }).fill(password);
      const done = serverFnDone(person.page);
      await person.page.getByRole("button", { name: "Sign in", exact: true }).click();
      await done;
    };

    await step(
      "failed sign-in reads the same for unknown and known addresses; repeated failures lock the address",
      async () => {
        await passwordLogin(mallory, "nobody@example.com", "some long password guess");
        const unknown = await mallory.page.getByRole("alert").innerText();
        await passwordLogin(mallory, CAROL, "some long password guess");
        const known = await mallory.page.getByRole("alert").innerText();
        assert.equal(unknown, known);
        for (let attempt = 0; attempt < 10; attempt += 1)
          await passwordLogin(mallory, CAROL, `wrong guess number ${attempt}!`);
        await passwordLogin(mallory, CAROL, carolPassword);
        await mallory.page.getByText("Too many attempts").waitFor();
        await db.query("delete from rate_limits where key like 'login:acct:%'");
      },
    );

    await step("password reset by email signs out every session; the link works once", async () => {
      await mallory.page.goto(`${HUB}/forgot-password`);
      await mallory.page.getByLabel("Email").fill(CAROL);
      await mallory.page.getByRole("button", { name: "Send reset link" }).click();
      await mallory.page.getByText("If an account uses that address").waitFor();
      const reset = mailTo(CAROL).at(-1);
      assert.equal(reset.subject, "Reset your Identity Hub password");
      carolPassword = "harbor quiet pencil orbit";
      await mallory.page.goto(reset.link);
      await mallory.page.getByLabel("New password", { exact: true }).fill(carolPassword);
      await mallory.page.getByLabel("Repeat new password", { exact: true }).fill(carolPassword);
      await mallory.page.getByRole("button", { name: "Save password" }).click();
      await mallory.page.waitForURL(`${HUB}/login?**`);
      await mallory.page.goto(reset.link);
      await mallory.page.getByText("This reset link expired or was already used.").waitFor();
      assert.equal(mailTo(CAROL).at(-1).subject, "Your Identity Hub password was changed");
      await carol.page.goto(`${HUB}/workspace`);
      await carol.page.waitForURL(`${HUB}/login?**`);
      await passwordLogin(carol, CAROL, "violet tractor mountain lamp");
      await carol.page.getByText("That email and password do not match an account.").waitFor();
      await passwordLogin(carol, CAROL, carolPassword);
      await carol.page.waitForURL(`${HUB}/workspace`);
    });

    let recoveryCodes = [];
    await step(
      "two-factor: set up with an authenticator, sign in with a code, recovery codes work once",
      async () => {
        await carol.page.goto(`${HUB}/settings`);
        await carol.page.getByRole("button", { name: "Set up authenticator app" }).click();
        const secret = (await carol.page.locator("span.break-all").innerText()).trim();
        assert.match(secret, /^[A-Z2-7]{32}$/);
        await carol.page.getByLabel("6-digit code").fill(totp(secret));
        await carol.page.getByRole("button", { name: "Turn on two-factor" }).click();
        await carol.page.getByText("Save these recovery codes now").waitFor();
        recoveryCodes = (await carol.page.locator("ul.grid li").allInnerTexts()).map((code) =>
          code.trim(),
        );
        assert.equal(recoveryCodes.length, 10);
        await carol.page.getByRole("button", { name: "I saved them" }).click();
        await carol.page.getByText("On, with an authenticator app").waitFor();
        await shot(carol.page, "settings");

        const signOut = async () => {
          await carol.page.getByRole("button", { name: "Sign out" }).first().click();
          await carol.page.waitForURL(`${HUB}/`);
        };
        const secondStep = async (code) => {
          await passwordLogin(carol, CAROL, carolPassword);
          await carol.page.getByLabel("Code from your authenticator app").fill(code);
          const done = serverFnDone(carol.page);
          await carol.page.getByRole("button", { name: "Verify" }).click();
          await done;
        };
        await signOut();
        await secondStep(totp(secret, 1));
        await carol.page.waitForURL(`${HUB}/workspace`);
        await signOut();
        await secondStep(recoveryCodes[0]);
        await carol.page.waitForURL(`${HUB}/workspace`);
        assert.equal(mailTo(CAROL).at(-1).subject, "A recovery code was used");
        await signOut();
        await secondStep(recoveryCodes[0]);
        await carol.page.getByText("That code is not valid.").waitFor();
        const done = serverFnDone(carol.page);
        await carol.page.getByLabel("Code from your authenticator app").fill(recoveryCodes[1]);
        await carol.page.getByRole("button", { name: "Verify" }).click();
        await done;
        await carol.page.waitForURL(`${HUB}/workspace`);
      },
    );

    let snippet = "";
    await step(
      "widget builder: pick methods and theme, preview updates live, config is served to any site",
      async () => {
        await alice.page.goto(app.builderUrl);
        await alice.page.getByRole("button", { name: "Continue with Facebook" }).waitFor();
        for (const label of [
          "Instagram",
          "Facebook",
          "TikTok",
          "LinkedIn",
          "YouTube",
          "Reddit",
          "Snapchat",
        ]) {
          await alice.page.getByRole("checkbox", { name: label, exact: true }).uncheck();
        }
        await alice.page.getByRole("radio", { name: "dark" }).check();
        await alice.page.getByText("All changes saved").waitFor();
        await alice.page.getByRole("button", { name: "Continue with X" }).waitFor();
        await alice.page.getByRole("button", { name: "Continue with Email" }).waitFor();
        assert.equal(
          await alice.page.getByRole("button", { name: "Continue with Facebook" }).count(),
          0,
        );
        snippet = await alice.page.locator("pre").innerText();
        assert.ok(snippet.includes(`data-client-id="${app.clientId}"`));
        assert.ok(snippet.includes(`data-redirect-uri="${APP_REDIRECT}"`));
        assert.ok(snippet.includes(`src="${HUB}/widget.js"`));
        await shot(alice.page, "widget-builder");
        const config = await fetch(`${HUB}/api/v1/widget/${app.clientId}`, {
          headers: { origin: "https://shop.example" },
        });
        assert.equal(config.headers.get("access-control-allow-origin"), "*");
        const body = await config.json();
        assert.deepEqual(
          body.methods.map((m) => m.id),
          ["twitter", "password"],
        );
        assert.equal(body.theme, "dark");
      },
    );

    await step(
      "the copied widget on another site signs an email user in with state checked",
      async () => {
        await carol.context.route("http://localhost:3472/shop", (route) =>
          route.fulfill({
            status: 200,
            contentType: "text/html",
            body: `<!doctype html><title>Shop</title><h1>Shop</h1>${snippet}`,
          }),
        );
        await carol.page.goto("http://localhost:3472/shop");
        await carol.page.getByRole("button", { name: "Continue with Email" }).click();
        await carol.page.getByRole("heading", { name: "Sign in to SocialPostAPI" }).waitFor();
        await carol.page.getByText("SocialPostAPI will only learn who you are.").waitFor();
        await carol.page.getByRole("button", { name: "Allow" }).click();
        await carol.page.waitForURL(`${APP_REDIRECT}**`);
        const back = carol.captured.at(-1);
        const cookie = (await carol.context.cookies("http://localhost:3472")).find(
          (c) => c.name === "ihub_state",
        );
        assert.ok(cookie && cookie.value.length >= 40);
        assert.equal(
          back.searchParams.get("state"),
          cookie.value,
          "state matches the widget's cookie",
        );
        const exchanged = await api(
          "/api/v1/oauth/token",
          form({
            code: back.searchParams.get("code"),
            redirect_uri: APP_REDIRECT,
            client_id: app.clientId,
            client_secret: app.clientSecret,
          }),
        );
        assert.equal(exchanged.status, 200, JSON.stringify(exchanged.body));
        assert.equal(exchanged.body.user.email, CAROL);
        assert.deepEqual(exchanged.body.accounts, []);
      },
    );

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
      assert.equal(rows[0].n, 3);
    });

    await step("data deletion removes the person and everything they own", async () => {
      await alice.page.goto(`${HUB}/deletion`);
      await alice.page.getByRole("button", { name: "Delete my account and data" }).click();
      await alice.page.getByText("Your data was deleted.").waitFor();
      const users = await db.query("select display_name from users");
      assert.deepEqual(users.rows.map((r) => r.display_name).sort(), ["Carol Example", "bob"]);
      const leftovers = await db.query(
        "select (select count(*) from accounts)::int as a, (select count(*) from apps)::int as p",
      );
      assert.deepEqual(leftovers.rows[0], { a: 1, p: 0 });
    });

    await step("no CSP violation or script error on any hub page", async () => {
      assert.deepEqual(consoleErrors, []);
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
