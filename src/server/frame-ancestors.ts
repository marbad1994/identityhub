import { one } from "./db";
import { safeReturnTo } from "./oauth";
import { widgetAppearance, type WidgetAppearance } from "@/lib/widget-appearance";

/** Backstop only. updateApp and deleteApp drop the key immediately. */
const TTL_MS = 60_000;

type Cached = { origins: string[]; name: string; appearance: WidgetAppearance; expires: number };
const cache = new Map<string, Cached>();

export function forgetFrameAncestors(clientId: string): void {
  cache.delete(clientId);
}

export type FrameLookup =
  | { ok: true; clientId: string; origins: string[]; name: string; appearance: WidgetAppearance }
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
  const app = await one<{
    name: string;
    homepage_url: string;
    redirect_uris: string[];
    widget_theme: string;
    widget_accent: string;
  }>(
    `select name, homepage_url, redirect_uris, widget_theme, widget_accent from apps where client_id = $1`,
    [clientId],
  );
  if (!app) {
    cache.delete(clientId);
    return null;
  }
  const entry = {
    origins: originsOf(app.homepage_url, app.redirect_uris),
    name: app.name,
    appearance: widgetAppearance(app.widget_theme, app.widget_accent),
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
  return { ok: true, clientId, origins: app.origins, name: app.name, appearance: app.appearance };
}

export async function embedParentStatus(
  returnTo: string | null | undefined,
  parentOrigin: string | null | undefined,
): Promise<{ allowed: boolean; appName: string | null; appearance: WidgetAppearance }> {
  const found = await lookupFrameApp(returnTo ?? null);
  if (!found.ok) return { allowed: false, appName: null, appearance: widgetAppearance() };
  return {
    allowed: Boolean(parentOrigin && found.origins.includes(parentOrigin)),
    appName: found.name,
    appearance: found.appearance,
  };
}
