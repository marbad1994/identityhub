/**
 * Cross-site cookie check. Not part of npm test and not what the shop step in
 * run.mjs proves: that shop and the hub are different localhost ports, so they
 * are same-site and a Lax cookie is sent to the frame.
 *
 * Skips unless EMBED_HUB_ORIGIN and EMBED_SHOP_ORIGIN are https URLs on
 * different registrable domains. Then: a planted Lax session cookie is absent
 * on the iframe's document request, and a cookie set by that embed response
 * is not sent on a later top-level request to the hub.
 */
const hub = httpsUrl(process.env.EMBED_HUB_ORIGIN);
const shop = httpsUrl(process.env.EMBED_SHOP_ORIGIN);

function httpsUrl(value) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function registrable(hostname) {
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return hostname;
  const labels = hostname.split(".");
  return labels.length < 2 ? hostname : labels.slice(-2).join(".");
}

if (!hub || !shop || registrable(hub.hostname) === registrable(shop.hostname)) {
  console.log(
    "embed-cookies: skipped (set EMBED_HUB_ORIGIN and EMBED_SHOP_ORIGIN to https origins on different registrable domains)",
  );
  process.exit(0);
}

const { chromium } = await import("playwright");
const session = "__Host-ihub_session";
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: session,
      value: "planted-lax-session",
      url: hub.origin,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  const iframeCookies = [];
  const setByEmbed = new Set();
  page.on("request", (request) => {
    if (request.resourceType() !== "document") return;
    if (!request.url().startsWith(hub.origin)) return;
    if (!request.frame().parentFrame()) return;
    iframeCookies.push(request.headers()["cookie"] ?? "");
  });
  page.on("response", (response) => {
    const request = response.request();
    if (!request.frame().parentFrame()) return;
    if (!response.url().startsWith(hub.origin)) return;
    for (const header of response.headersArray()) {
      if (header.name.toLowerCase() !== "set-cookie") continue;
      const name = header.value.split("=", 1)[0];
      if (name) setByEmbed.add(name);
    }
  });
  const frameSrc = `${hub.origin}/login?embed=1`;
  await page.route(`${shop.origin}/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html><title>Shop</title><iframe title="Sign in with Identity Hub" src="${frameSrc}"></iframe>`,
    }),
  );
  await page.goto(`${shop.origin}/`);
  if (iframeCookies.length === 0) throw new Error("iframe document request was not seen");
  for (const cookie of iframeCookies) {
    if (cookie.includes(session)) throw new Error("Lax session cookie was sent to the embed");
  }
  const top = await context.newPage();
  const topRequest = top.waitForRequest(
    (request) => request.url().startsWith(hub.origin) && request.resourceType() === "document",
  );
  await top.goto(`${hub.origin}/login`);
  const topCookie = (await topRequest).headers()["cookie"] ?? "";
  if (!topCookie.includes(session)) throw new Error("planted Lax cookie missing on top-level hub");
  for (const name of setByEmbed) {
    if (name === session) continue;
    if (topCookie.includes(`${name}=`)) throw new Error(`${name} set during embed was sent top-level`);
  }
  console.log("embed-cookies: passed");
} finally {
  await browser.close();
}
