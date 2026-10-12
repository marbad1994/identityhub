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

/** The one callback URL to register with each platform. */
export function callbackUrl(id: PlatformId): string {
  return `${appOrigin()}/api/auth/callback/${id}`;
}
