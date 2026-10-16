import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { canonicalAuthUrl } from "./server/auth-origin";
import { appOrigin } from "./server/env";
import { lookupFrameApp } from "./server/frame-ancestors";
import { embedProbeCookies } from "./server/session";

/** Public endpoints other sites load (the widget's config); they need CORS and cross-origin CORP. */
const isPublicApi = (pathname: string) =>
  pathname.startsWith("/api/v1/widget/") || pathname.startsWith("/api/v1/relay/");

const CREDENTIAL_PATHS = new Set(["/login", "/signup", "/forgot-password"]);

type FramePolicy = { ancestors: string; frame: boolean };

/** Fail closed. A thrown lookup must still send DENY, not a 500 that skips it. */
async function framePolicy(request: Request): Promise<FramePolicy> {
  const deny: FramePolicy = { ancestors: "'none'", frame: false };
  const url = new URL(request.url);
  if (!CREDENTIAL_PATHS.has(url.pathname)) return deny;
  const embed = url.searchParams.get("embed");
  if (embed !== "1") {
    if (embed !== null) console.info(`[frame] client_id= path=${url.pathname} reason=no_embed`);
    return deny;
  }
  try {
    const found = await lookupFrameApp(url.searchParams.get("return_to"));
    if (!found.ok) {
      console.info(
        `[frame] client_id=${found.clientId ?? ""} path=${url.pathname} reason=${found.reason}`,
      );
      return deny;
    }
    return { ancestors: found.origins.join(" "), frame: true };
  } catch (error) {
    console.info(`[frame] client_id= path=${url.pathname} reason=lookup_failed`);
    console.error("[frame]", error instanceof Error ? error.message : error);
    return deny;
  }
}

/**
 * Security headers on every response, with a fresh CSP nonce per request.
 * The nonce reaches the router (src/router.tsx) through the middleware
 * context, so every inline script the framework writes carries it.
 */
const securityHeaders = createMiddleware().server(async ({ next, request }) => {
  const canonical = canonicalAuthUrl(request, appOrigin());
  if (canonical) {
    return new Response(null, {
      status: 302,
      headers: { location: canonical, "cache-control": "no-store" },
    });
  }
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const result = await next({ context: { nonce } });
  const headers = result.response.headers;
  const url = new URL(request.url);
  const framing = await framePolicy(request);
  const set = (name: string, value: string) => {
    if (!headers.has(name)) headers.set(name, value);
  };
  set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      `style-src 'self' 'nonce-${nonce}'`,
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      `frame-ancestors ${framing.ancestors}`,
    ].join("; "),
  );
  set("X-Content-Type-Options", "nosniff");
  // Credential embeds omit this: modern browsers need the CSP allowlist alone.
  // /authorize keeps DENY, including when embed=1 is present.
  if (!framing.frame) set("X-Frame-Options", "DENY");
  set("Referrer-Policy", "strict-origin-when-cross-origin");
  set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  );
  // Hub pages keep their link to the sign-in popups they open. Pages a popup
  // passes through (/authorize, opened by the widget on another site, and the
  // /api/auth/* hops) do not cut the link to their opener, so the popup can
  // still close itself at the end.
  const inPopupFlow = url.pathname === "/authorize" || url.pathname.startsWith("/api/auth/");
  set("Cross-Origin-Opener-Policy", inPopupFlow ? "unsafe-none" : "same-origin-allow-popups");
  set(
    "Cross-Origin-Resource-Policy",
    isPublicApi(url.pathname) || framing.frame ? "cross-origin" : "same-origin",
  );
  if (framing.frame) {
    for (const probe of embedProbeCookies()) headers.append("set-cookie", probe);
  }
  // HSTS only means something on https; the public IP port serves plain http.
  if ((request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")) === "https") {
    set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  // Pages carry per-user data: never cache them in shared caches.
  set("Cache-Control", "no-store");
  return result;
});

/**
 * Server functions and the sign-out form must come from this site.
 * Sec-Fetch-Site is checked first; Origin is accepted when it matches the
 * public origin or the request's own host (direct access on the IP port).
 */
const csrf = createCsrfMiddleware({
  filter: ({ handlerType, request }) =>
    handlerType === "serverFn" ||
    (request.method === "POST" && new URL(request.url).pathname === "/api/auth/logout"),
  origin: (origin, { request }) => {
    const configured = process.env.APP_ORIGIN?.trim().replace(/\/+$/, "");
    if (configured && origin === configured) return true;
    try {
      return new URL(origin).host === request.headers.get("host");
    } catch {
      return false;
    }
  },
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders, csrf],
}));
