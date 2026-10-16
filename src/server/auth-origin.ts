/** Keep authentication and account pages on the host that owns the session cookie. */
export function canonicalAuthUrl(request: Request, origin: string): string | null {
  if (request.method !== "GET") return null;
  const url = new URL(request.url);
  const paths = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/authorize",
    "/workspace",
    "/settings",
    "/deletion",
    "/apps",
  ];
  if (
    !paths.includes(url.pathname) &&
    !url.pathname.startsWith("/apps/") &&
    !url.pathname.startsWith("/api/auth/")
  )
    return null;

  const canonical = new URL(origin);
  // Behind Caddy the connection to the container is HTTP, but the browser is on HTTPS.
  const host = request.headers.get("host") ?? url.host;
  const protocol = request.headers.get("x-forwarded-proto") ?? url.protocol.slice(0, -1);
  if (host === canonical.host && `${protocol}:` === canonical.protocol) return null;

  // Assign components rather than resolve a path, so the configured host always wins.
  canonical.pathname = url.pathname;
  canonical.search = url.search;
  return canonical.href;
}
