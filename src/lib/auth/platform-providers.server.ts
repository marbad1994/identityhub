/**
 * Direct sign-in with each social platform (server-only).
 *
 * One Better Auth `genericOAuth` entry per platform in `OAUTH_PROVIDERS`, built
 * from the same `<PLATFORM>_CLIENT_*` credentials the connector flow uses. A
 * platform is offered only when both credentials are set. Callback to register:
 * `{BETTER_AUTH_URL}/api/auth/oauth2/callback/<platform id>`.
 */
import type { GenericOAuthConfig } from "better-auth/plugins";
import {
  OAUTH_PROVIDERS,
  providerCredentials,
  providerScopes,
  type OAuthProvider,
} from "@/lib/broker/providers";

type UserInfo = {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  emailVerified: boolean;
};

const USER_AGENT = "identity-hub/1.0";

async function getJson(url: string, accessToken: string): Promise<Record<string, any> | null> {
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/json",
      "user-agent": USER_AGENT,
    },
  });
  if (!res.ok) return null;
  return (await res.json()) as Record<string, any>;
}

/** Platforms that return no email get a stable synthetic one (never verified). */
function withEmail(provider: OAuthProvider, info: Omit<UserInfo, "emailVerified"> & { emailVerified?: boolean }): UserInfo {
  return {
    ...info,
    email: info.email ?? `${info.id}@${provider.id}.identityhub.invalid`,
    emailVerified: info.email ? Boolean(info.emailVerified) : false,
  };
}

const USER_INFO: Record<string, (provider: OAuthProvider, token: string) => Promise<UserInfo | null>> = {
  async x(provider, token) {
    const body = await getJson("https://api.twitter.com/2/users/me?user.fields=profile_image_url", token);
    const u = body?.data;
    if (!u?.id) return null;
    return withEmail(provider, { id: String(u.id), name: u.name ?? u.username, image: u.profile_image_url });
  },
  async instagram(provider, token) {
    const u = await getJson(`https://graph.instagram.com/me?fields=user_id,username&access_token=${encodeURIComponent(token)}`, token);
    const id = u?.user_id ?? u?.id;
    if (!id) return null;
    return withEmail(provider, { id: String(id), name: u?.username });
  },
  async facebook(provider, token) {
    const u = await getJson("https://graph.facebook.com/v21.0/me?fields=id,name,email,picture.type(large)", token);
    if (!u?.id) return null;
    return withEmail(provider, { id: String(u.id), name: u.name, email: u.email, image: u.picture?.data?.url, emailVerified: true });
  },
  async tiktok(provider, token) {
    const body = await getJson("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", token);
    const u = body?.data?.user;
    if (!u?.open_id) return null;
    return withEmail(provider, { id: String(u.open_id), name: u.display_name, image: u.avatar_url });
  },
  async linkedin(provider, token) {
    const u = await getJson("https://api.linkedin.com/v2/userinfo", token);
    if (!u?.sub) return null;
    return withEmail(provider, { id: String(u.sub), name: u.name, email: u.email, image: u.picture, emailVerified: u.email_verified });
  },
  async youtube(provider, token) {
    const u = await getJson("https://openidconnect.googleapis.com/v1/userinfo", token);
    if (!u?.sub) return null;
    return withEmail(provider, { id: String(u.sub), name: u.name, email: u.email, image: u.picture, emailVerified: u.email_verified });
  },
  async reddit(provider, token) {
    const u = await getJson("https://oauth.reddit.com/api/v1/me", token);
    if (!u?.id) return null;
    return withEmail(provider, { id: String(u.id), name: u.name, image: u.icon_img?.split("?")[0] });
  },
};

/** TikTok names the client id `client_key` in the token request. */
function tiktokToken(provider: OAuthProvider, clientId: string, clientSecret: string): GenericOAuthConfig["getToken"] {
  return async ({ code, redirectURI, codeVerifier }) => {
    const res = await fetch(provider.token, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectURI,
        ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
      }),
    });
    const raw = (await res.json()) as Record<string, any>;
    if (!res.ok || !raw.access_token) throw new Error(`TikTok token exchange failed: ${raw.error ?? res.status}`);
    return {
      tokenType: raw.token_type,
      accessToken: raw.access_token,
      refreshToken: raw.refresh_token,
      accessTokenExpiresAt: raw.expires_in ? new Date(Date.now() + raw.expires_in * 1000) : undefined,
      scopes: typeof raw.scope === "string" ? raw.scope.split(",") : [],
      raw,
    };
  };
}

/** Sign-in configs for every platform whose credentials are present. */
export function platformSignInConfigs(): GenericOAuthConfig[] {
  const configs: GenericOAuthConfig[] = [];
  for (const provider of OAUTH_PROVIDERS) {
    const creds = providerCredentials(provider);
    if (!creds) continue;
    const getUserInfo = USER_INFO[provider.id];
    configs.push({
      providerId: provider.id,
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      authorizationUrl: provider.authorize,
      tokenUrl: provider.token,
      scopes: providerScopes(provider, ["profile"]),
      pkce: provider.pkce,
      authentication: provider.basicAuth ? "basic" : "post",
      authorizationUrlParams: {
        ...provider.extraAuth,
        ...(provider.clientKeyName === "client_key" ? { client_key: creds.clientId } : {}),
      },
      ...(provider.clientKeyName === "client_key"
        ? { getToken: tiktokToken(provider, creds.clientId, creds.clientSecret) }
        : {}),
      getUserInfo: async (tokens) =>
        tokens.accessToken ? getUserInfo(provider, tokens.accessToken) : null,
    });
  }
  return configs;
}
