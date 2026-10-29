/** Browser smoke checks for the standalone prototype. No database or real providers. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const port = "4187";
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["scripts/preview-widget.mjs"], {
  env: { ...process.env, WIDGET_PREVIEW_PORT: port },
  stdio: "pipe",
});
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      if ((await fetch(`${origin}/widget-demo.html`)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* Server starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, "Preview server started");
  const executablePath =
    process.env.E2E_CHROMIUM ||
    [
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    ].find(existsSync);
  browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1120 } });
  const errors = [];
  const requests = [];
  context.on("page", (page) => page.on("pageerror", (error) => errors.push(error.message)));
  context.on("request", (request) => requests.push(request));
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const card = page.locator("#auth-card");
  const heading = card.locator("h2");
  const expectHeading = async (text) => {
    await heading.filter({ hasText: text }).waitFor();
  };
  const restart = async () => {
    await page.getByRole("button", { name: "Restart demo", exact: true }).click();
    await expectHeading("Welcome to Makketing");
  };
  const startPopup = async (method) => {
    const opened = page.waitForEvent("popup");
    await card.getByRole("button", { name: `Continue with ${method}`, exact: true }).click();
    const popup = await opened;
    await popup.getByRole("button", { name: "Continue as Alex" }).waitFor();
    return popup;
  };
  const approvePopup = async (popup) => {
    const closed = popup.waitForEvent("close");
    await popup.getByRole("button", { name: "Continue as Alex" }).click();
    await closed;
  };
  await page.goto(`${origin}/widget-demo.html`);
  await expectHeading("Welcome to Makketing");
  const screenshots = process.env.E2E_SCREENSHOTS;
  if (screenshots) {
    mkdirSync(screenshots, { recursive: true });
    await page.screenshot({
      path: `${screenshots}/widget-demo-desktop.png`,
      fullPage: true,
      animations: "disabled",
    });
  }

  // Real local popup closes, parent verifies the sender, then asks for consent.
  let popup = await startPopup("X");
  await page.evaluate(() =>
    window.postMessage(
      { source: "identityhub-widget-demo", nonce: "forged", status: "approved" },
      location.origin,
    ),
  );
  await expectHeading("Continue in X");
  await approvePopup(popup);
  await expectHeading("You're in control.");
  assert.equal(
    await card.getByRole("checkbox").isChecked(),
    false,
    "Optional publishing starts off",
  );
  await card.getByRole("button", { name: "Allow & continue to Makketing" }).click();
  await expectHeading("You're all set, Alex.");
  assert.ok((await card.innerText()).includes("Basic profile only"));
  await card.getByRole("button", { name: "Continue to Makketing", exact: true }).click();
  await expectHeading("Welcome to Makketing.");
  console.log("PASS X popup, automatic close, sender validation, minimal access, return to app");

  await restart();
  popup = await startPopup("TikTok");
  await approvePopup(popup);
  await expectHeading("You're in control.");
  await card.getByRole("button", { name: "Don't allow" }).click();
  await expectHeading("Your choice is respected.");
  console.log("PASS TikTok and declined access");

  await restart();
  await page.getByLabel("Try a scenario").selectOption("closed");
  const closedPopup = await startPopup("X");
  await closedPopup.waitForEvent("close");
  await expectHeading("The sign-in window closed.");
  const retried = page.waitForEvent("popup");
  await card.getByRole("button", { name: "Try again" }).click();
  popup = await retried;
  await approvePopup(popup);
  await expectHeading("You're in control.");
  console.log("PASS early popup close and working retry");

  await page.getByLabel("Try a scenario").selectOption("error");
  await card.getByRole("button", { name: "Continue with email" }).click();
  assert.equal(await card.locator('input[type="password"]').getAttribute("readonly"), "");
  await card.getByRole("button", { name: "Sign in to demo", exact: true }).click();
  await expectHeading("Let's try that again.");
  await card.getByRole("button", { name: "Try again" }).click();
  await card.getByRole("button", { name: "Sign in to demo", exact: true }).click();
  await expectHeading("You're in control.");
  await card.getByRole("checkbox").check();
  await card.getByRole("button", { name: "Allow & continue to Makketing" }).click();
  await expectHeading("You're all set, Alex.");
  assert.ok((await card.innerText()).includes("Profile + publishing"));
  console.log("PASS email interruption, recovery, explicit publishing permission");

  await page.getByLabel("Try a scenario").selectOption("success");
  await card.getByRole("button", { name: "Create an account", exact: true }).click();
  await expectHeading("A fresh start.");
  await card.getByRole("button", { name: "Create demo account" }).click();
  await expectHeading("You're in control.");
  await restart();
  await card.getByRole("button", { name: "Continue with email" }).click();
  await card.getByRole("button", { name: "Forgot password?" }).click();
  await expectHeading("A little help getting in.");
  console.log("PASS sign-up and password reset preview");

  await restart();
  await page.evaluate(() => {
    window.open = () => null;
  });
  await card.getByRole("button", { name: "Continue with X", exact: true }).click();
  await expectHeading("Let's continue here.");
  await card.getByRole("button", { name: "Continue as Alex" }).click();
  await expectHeading("You're in control.");
  console.log("PASS popup-blocked fallback");

  await restart();
  await page.getByLabel("Application name").fill('<img src=x onerror="x">');
  assert.equal(await card.locator("img").count(), 0, "App name is escaped");
  await page.getByLabel("Application name").fill("Makketing");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.getByRole("button", { name: "Ocean accent" }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.getByRole("button", { name: "Mobile preview" }).click();
  await page.waitForFunction(
    () => document.getElementById("auth-card").getBoundingClientRect().width <= 340.1,
  );
  if (screenshots)
    await page.screenshot({
      path: `${screenshots}/widget-demo-dark.png`,
      fullPage: true,
      animations: "disabled",
    });
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await page.getByRole("button", { name: "Sage accent" }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "No horizontal overflow on mobile",
  );
  if (screenshots)
    await page.screenshot({
      path: `${screenshots}/widget-demo-mobile.png`,
      fullPage: true,
      animations: "disabled",
    });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Restart demo", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expectHeading("Welcome to Makketing");
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    "flow-heading",
    "Focus moves to the new step",
  );
  assert.deepEqual(errors, [], "No browser runtime errors");
  assert.ok(
    requests.every((request) => request.url().startsWith(origin) && request.method() === "GET"),
    "No external requests or form submissions",
  );
  console.log(
    "PASS escaped branding, light/dark, mobile layout, reduced motion, keyboard focus, zero external requests",
  );
} finally {
  await browser?.close();
  server.kill();
}
