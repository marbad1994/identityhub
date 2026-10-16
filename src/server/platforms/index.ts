import type { PlatformId } from "@/lib/platforms";
import { appOrigin, env } from "../env";
import { facebook } from "./facebook";
import { instagram } from "./instagram";
import { linkedin } from "./linkedin";
import { reddit } from "./reddit";
import { snapchat } from "./snapchat";
import { tiktok } from "./tiktok";
import { twitter } from "./twitter";
import type { Credentials, Platform } from "./types";
import { youtube } from "./youtube";

const REGISTRY: Record<PlatformId, Platform> = {
  twitter,
  instagram,
  facebook,
  tiktok,
  linkedin,
  youtube,
  reddit,
  snapchat,
};

export function platform(id: string): Platform | undefined {
  return Object.hasOwn(REGISTRY, id) ? REGISTRY[id as PlatformId] : undefined;
}

export function credentialNames(p: Platform): [string, string] {
  return [`${p.envPrefix}_CLIENT_ID`, `${p.envPrefix}_CLIENT_SECRET`];
}

export function credentials(p: Platform): Credentials | null {
  const [idName, secretName] = credentialNames(p);
  const clientId = env(idName);
  const clientSecret = env(secretName);
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** Ids of the platforms with credentials configured on this host. */
export function enabledPlatforms(): PlatformId[] {
  return (Object.keys(REGISTRY) as PlatformId[]).filter((id) => credentials(REGISTRY[id]) !== null);
}

/**
 * The redirect URI sent to each platform. By default the hub's own
 * callback. With PLATFORM_CALLBACK_BASE (e.g.
 * https://socialpostapi.makketing.com/api/connect) the hub reuses the
 * callbacks already registered for SocialPostAPI, which forwards any callback
 * whose state starts with HUB_STATE_PREFIX back to the hub, so no platform
 * app needs a new redirect URI.
 */
export function callbackUrl(id: PlatformId): string {
  const base = env("PLATFORM_CALLBACK_BASE")?.replace(/\/+$/, "");
  return base ? `${base}/${id}/callback` : `${appOrigin()}/api/auth/callback/${id}`;
}

/** Marks the hub's OAuth states so SocialPostAPI's callback can tell them apart. */
export const HUB_STATE_PREFIX = "ihub_st_";
