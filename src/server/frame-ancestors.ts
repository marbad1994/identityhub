import { one } from "./db";
import { safeReturnTo } from "./oauth";

/** Backstop only. updateApp and deleteApp drop the key immediately. */
const TTL_MS = 60_000;

type Cached = { origins: string[]; name: string; expires: number };
const cache = new Map<string, Cached>();

export function forgetFrameAncestors(clientId: string): void {
  cache.delete(clientId);
}

export type FrameLookup =
  | { ok: true; clientId: string; origins: string[]; name: string }
  | { ok: false; reason: "bad_return_to" | "unknown_client"; clientId?: string };

function originsOf(homepage: string, redirects: string[]): string[] {
  const origins: string[] = [];
  for (const value of [homepage, ...redirects]) {
    const origin = new URL(value).origin;
    if (!origins.includes(origin)) origins.push(origin);
  }
  return origins;
}

async function loadApp(clientId: string): Promise<Cached | null> {
  const hit = cache.get(clientId);
  if (hit && hit.expires > Date.now()) return hit;
  const app = await one<{ name: string; homepage_url: string; redirect_uris: string[] }>(
    `select name, homepage_url, redirect_uris from apps where client_id = $1`,
    [clientId],
  );
  if (!app) {
    cache.delete(clientId);
    return null;
  }
  const entry = {
    origins: originsOf(app.homepage_url, app.redirect_uris),
    name: app.name,
    expires: Date.now() + TTL_MS,
  };
  cache.set(clientId, entry);
  return entry;
}

/** Client id comes from the decoded return_to query, not a sibling of /login. */
export async function lookupFrameApp(returnTo: string | null): Promise<FrameLookup> {
  if (!returnTo || safeReturnTo(returnTo, "") !== returnTo)
    return { ok: false, reason: "bad_return_to" };
  const query = returnTo.indexOf("?");
  const clientId =
    query === -1 ? null : new URLSearchParams(returnTo.slice(query + 1)).get("client_id");
  if (!clientId) return { ok: false, reason: "bad_return_to" };
  const app = await loadApp(clientId);
  if (!app) return { ok: false, reason: "unknown_client", clientId };
  return { ok: true, clientId, origins: app.origins, name: app.name };
}

export async function embedParentStatus(
  returnTo: string | null | undefined,
  parentOrigin: string | null | undefined,
): Promise<{ allowed: boolean; appName: string | null }> {
  const found = await lookupFrameApp(returnTo ?? null);
  if (!found.ok) return { allowed: false, appName: null };
  return {
    allowed: Boolean(parentOrigin && found.origins.includes(parentOrigin)),
    appName: found.name,
  };
}
