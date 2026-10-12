import type { PlatformId } from "@/lib/platforms";

export type Credentials = { clientId: string; clientSecret: string };

/** One account the person can hand to products (a profile, a Page, a channel). */
export type PlatformAccount = {
  accountId: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  accessToken: string;
  /** Token used to renew `accessToken`. For Facebook Pages, the long-lived user token. */
  refreshToken: string | null;
  expiresAt: Date | null;
  platformScopes: string;
};

/** Result of a completed authorization: who signed in, and the accounts it unlocked. */
export type PlatformLogin = {
  /** Stable id of the person on the platform, used to sign in to the hub. */
  subject: { id: string; displayName: string; avatarUrl: string | null };
  accounts: PlatformAccount[];
};

export type StoredTokens = {
  accountId: string;
  accessToken: string;
  refreshToken: string | null;
};

export type RefreshedTokens = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: Date | null;
};

export type Platform = {
  id: PlatformId;
  /** Env var prefix: `<PREFIX>_CLIENT_ID`, `<PREFIX>_CLIENT_SECRET`. Same names as SocialPostAPI. */
  envPrefix: string;
  pkce: boolean;
  authorizeUrl(input: {
    creds: Credentials;
    redirectUri: string;
    state: string;
    challenge: string;
  }): string;
  exchange(input: {
    creds: Credentials;
    code: string;
    redirectUri: string;
    verifier: string;
  }): Promise<PlatformLogin>;
  /** Renew an account's access token. Absent when the platform cannot refresh. */
  refresh?(input: { creds: Credentials; tokens: StoredTokens }): Promise<RefreshedTokens>;
};
