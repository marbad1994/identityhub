/**
 * Platform catalogue shared by the browser and the server. Ids match
 * SocialPostAPI's platform ids, so a connection handed to a product can be
 * used there without translation.
 */
export const SCOPES = {
  profile: "Read the account's name, handle and picture",
  publish: "Publish posts and media on the account's behalf",
} as const;

export type ScopeId = keyof typeof SCOPES;

export const SCOPE_IDS = Object.keys(SCOPES) as ScopeId[];

export type PlatformId =
  | "google"
  | "twitter"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "linkedin"
  | "youtube"
  | "reddit"
  | "snapchat";

export type PlatformInfo = {
  id: PlatformId;
  label: string;
  /** Hub scopes a connection on this platform can grant to products. */
  scopes: ScopeId[];
  /** Identity-only providers have no publishing account to connect or share. */
  identityOnly?: boolean;
};

export const PLATFORMS: PlatformInfo[] = [
  { id: "google", label: "Google", scopes: [], identityOnly: true },
  { id: "twitter", label: "X", scopes: ["profile", "publish"] },
  { id: "instagram", label: "Instagram", scopes: ["profile", "publish"] },
  { id: "facebook", label: "Facebook", scopes: ["profile", "publish"] },
  { id: "tiktok", label: "TikTok", scopes: ["profile", "publish"] },
  { id: "linkedin", label: "LinkedIn", scopes: ["profile", "publish"] },
  { id: "youtube", label: "YouTube", scopes: ["profile", "publish"] },
  { id: "reddit", label: "Reddit", scopes: ["profile", "publish"] },
  // Snap Login Kit is identity only: Snapchat has no API for posting.
  { id: "snapchat", label: "Snapchat", scopes: ["profile"] },
];

export function platformInfo(id: string): PlatformInfo | undefined {
  return PLATFORMS.find((platform) => platform.id === id);
}

export function platformLabel(id: string): string {
  return platformInfo(id)?.label ?? id;
}

/** Parse a space- or comma-separated scope string into known hub scopes. */
export function parseScopes(value: string | null | undefined): ScopeId[] {
  const out: ScopeId[] = [];
  for (const part of (value ?? "").split(/[\s,]+/)) {
    if ((SCOPE_IDS as string[]).includes(part) && !out.includes(part as ScopeId))
      out.push(part as ScopeId);
  }
  return out;
}

/** A URL an app may register (homepage or redirect URI): https (or http on localhost), no fragment or credentials. */
export function validRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return false;
    return !url.hash && !url.username && !url.password;
  } catch {
    return false;
  }
}
