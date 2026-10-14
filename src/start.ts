import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";

/** Public endpoints other sites load (the widget's config); they need CORS and cross-origin CORP. */
const isPublicApi = (pathname: string) => pathname.startsWith("/api/v1/widget/");

/**
 * Security headers on every response, with a fresh CSP nonce per request.
 * The nonce reaches the router (src/router.tsx) through the middleware
 * context, so every inline script the framework writes carries it.
 */
const securityHeaders = createMiddleware().server(async ({ next, request }) => {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const result = await next({ context: { nonce } });
  const headers = result.response.headers;
  const url = new URL(request.url);
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
      "frame-ancestors 'none'",
    ].join("; "),
  );
  set("X-Content-Type-Options", "nosniff");
  set("X-Frame-Options", "DENY");
  set("Referrer-Policy", "strict-origin-when-cross-origin");
  set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  );
  set("Cross-Origin-Opener-Policy", "same-origin");
  set("Cross-Origin-Resource-Policy", isPublicApi(url.pathname) ? "cross-origin" : "same-origin");
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
