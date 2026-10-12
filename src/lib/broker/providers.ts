import type { ProviderId, ScopeId } from "@/lib/hub";

export type OAuthProvider = {
  id: ProviderId;
  label: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  pkce: boolean;
  extraAuth: Record<string, string>;
  scopes: Record<ScopeId, string[]>;
  authorize: string;
  token: string;
  basicAuth: boolean;
  clientKeyName: "client_id" | "client_key";
};

export const OAUTH_PROVIDERS: OAuthProvider[] = [
  {
    id: "x",
    label: "X",
    clientIdEnv: "X_CLIENT_ID",
    clientSecretEnv: "X_CLIENT_SECRET",
    pkce: true,
    extraAuth: {},
    scopes: {
      profile: ["users.read", "tweet.read", "offline.access"],
      media: ["tweet.read"],
      publish: ["tweet.write", "tweet.read", "users.read", "offline.access"],
      analytics: ["tweet.read", "users.read", "offline.access"],
    },
    authorize: "https://twitter.com/i/oauth2/authorize",
    token: "https://api.twitter.com/2/oauth2/token",
    basicAuth: true,
    clientKeyName: "client_id",
  },
  {
    id: "instagram",
    label: "Instagram",
    clientIdEnv: "INSTAGRAM_CLIENT_ID",
    clientSecretEnv: "INSTAGRAM_CLIENT_SECRET",
    pkce: false,
    extraAuth: {},
    scopes: {
      profile: ["instagram_business_basic"],
      media: ["instagram_business_basic", "instagram_business_content_publish"],
      publish: ["instagram_business_basic", "instagram_business_content_publish"],
      analytics: ["instagram_business_basic", "instagram_business_manage_insights"],
    },
    authorize: "https://www.instagram.com/oauth/authorize",
    token: "https://api.instagram.com/oauth/access_token",
    basicAuth: false,
    clientKeyName: "client_id",
  },
  {
    id: "facebook",
    label: "Facebook",
    clientIdEnv: "FACEBOOK_CLIENT_ID",
    clientSecretEnv: "FACEBOOK_CLIENT_SECRET",
    pkce: false,
    extraAuth: {},
    scopes: {
      profile: ["public_profile"],
      media: ["public_profile", "pages_show_list"],
      publish: ["public_profile", "pages_manage_posts", "pages_show_list"],
      analytics: ["public_profile", "read_insights", "pages_show_list"],
    },
    authorize: "https://www.facebook.com/v21.0/dialog/oauth",
    token: "https://graph.facebook.com/v21.0/oauth/access_token",
    basicAuth: false,
    clientKeyName: "client_id",
  },
  {
    id: "tiktok",
    label: "TikTok",
    clientIdEnv: "TIKTOK_CLIENT_KEY",
    clientSecretEnv: "TIKTOK_CLIENT_SECRET",
    pkce: true,
    extraAuth: {},
    scopes: {
      profile: ["user.info.basic"],
      media: ["user.info.basic", "video.list"],
      publish: ["user.info.basic", "video.publish"],
      analytics: ["user.info.basic", "user.info.stats"],
    },
    authorize: "https://www.tiktok.com/v2/auth/authorize/",
    token: "https://open.tiktokapis.com/v2/oauth/token/",
    basicAuth: false,
    clientKeyName: "client_key",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
    pkce: false,
    extraAuth: {},
    scopes: {
      profile: ["openid", "profile"],
      media: ["openid", "profile"],
      publish: ["openid", "profile", "w_member_social"],
      analytics: ["openid", "profile"],
    },
    authorize: "https://www.linkedin.com/oauth/v2/authorization",
    token: "https://www.linkedin.com/oauth/v2/accessToken",
    basicAuth: false,
    clientKeyName: "client_id",
  },
  {
    id: "youtube",
    label: "YouTube",
    clientIdEnv: "YOUTUBE_CLIENT_ID",
    clientSecretEnv: "YOUTUBE_CLIENT_SECRET",
    pkce: true,
    extraAuth: { access_type: "offline", prompt: "consent" },
    scopes: {
      profile: ["openid", "email", "profile"],
      media: ["openid", "profile", "https://www.googleapis.com/auth/youtube.readonly"],
      publish: ["openid", "profile", "https://www.googleapis.com/auth/youtube.upload"],
      analytics: ["openid", "profile", "https://www.googleapis.com/auth/yt-analytics.readonly"],
    },
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    basicAuth: false,
    clientKeyName: "client_id",
  },
  {
    id: "reddit",
    label: "Reddit",
    clientIdEnv: "REDDIT_CLIENT_ID",
    clientSecretEnv: "REDDIT_CLIENT_SECRET",
    pkce: false,
    extraAuth: { duration: "permanent" },
    scopes: {
      profile: ["identity"],
      media: ["identity", "read"],
      publish: ["identity", "submit"],
      analytics: ["identity", "read"],
    },
    authorize: "https://www.reddit.com/api/v1/authorize",
    token: "https://www.reddit.com/api/v1/access_token",
    basicAuth: true,
    clientKeyName: "client_id",
  },
];

export function oauthProvider(id: string): OAuthProvider | undefined {
  return OAUTH_PROVIDERS.find((provider) => provider.id === id);
}

export function providerScopes(provider: OAuthProvider, scopes: ScopeId[]): string[] {
  const out: string[] = [];
  for (const scope of scopes) {
    for (const value of provider.scopes[scope] ?? []) {
      if (!out.includes(value)) out.push(value);
    }
  }
  return out;
}

export function providerCredentials(provider: OAuthProvider): { clientId: string; clientSecret: string } | null {
  const clientId = process.env[provider.clientIdEnv]?.trim() ?? "";
  const clientSecret = process.env[provider.clientSecretEnv]?.trim() ?? "";
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function missingCredentialNames(provider: OAuthProvider): string[] {
  const missing: string[] = [];
  if (!process.env[provider.clientIdEnv]?.trim()) missing.push(provider.clientIdEnv);
  if (!process.env[provider.clientSecretEnv]?.trim()) missing.push(provider.clientSecretEnv);
  return missing;
}

export const PLAN_LIMITS = { sandbox: 0, starter: 5, growth: 25, scale: 100 } as const;

export const STRIPE_PRICES = {
  starter: "STRIPE_PRICE_STARTER",
  growth: "STRIPE_PRICE_GROWTH",
  scale: "STRIPE_PRICE_SCALE",
} as const;
