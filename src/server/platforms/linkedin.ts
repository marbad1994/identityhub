import { bearer, expiresAt, form, requestJson, withQuery } from "./http";
import type { Platform } from "./types";

const AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const SCOPES = ["openid", "profile", "w_member_social"];

export const linkedin: Platform = {
  id: "linkedin",
  envPrefix: "LINKEDIN",
  pkce: false,
  authorizeUrl: ({ creds, redirectUri, state }) =>
    withQuery(AUTHORIZE_URL, {
      response_type: "code",
      client_id: creds.clientId,
      redirect_uri: redirectUri,
      state,
      scope: SCOPES.join(" "),
    }),
  async exchange({ creds, code, redirectUri }) {
    const tokens = await requestJson("LinkedIn", TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
      }),
    });
    const user = await requestJson("LinkedIn", USERINFO_URL, {
      headers: bearer(tokens.access_token),
    });
    const id = String(user.sub);
    const name = user.name ?? id;
    return {
      subject: { id, displayName: name, avatarUrl: user.picture ?? null },
      accounts: [
        {
          accountId: id,
          handle: name,
          displayName: name,
          avatarUrl: user.picture ?? null,
          accessToken: tokens.access_token,
          // Only apps in LinkedIn's invite-only "Programmatic Refresh Tokens"
          // product receive one; others reconnect when the token expires.
          refreshToken: tokens.refresh_token ?? null,
          expiresAt: expiresAt(tokens.expires_in),
          platformScopes: tokens.scope ?? SCOPES.join(" "),
        },
      ],
    };
  },
  async refresh({ creds, tokens }) {
    if (!tokens.refreshToken) throw new Error("LinkedIn access expired; reconnect the account");
    const next = await requestJson("LinkedIn", TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form({
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
      }),
    });
    return {
      accessToken: next.access_token,
      refreshToken: next.refresh_token ?? tokens.refreshToken,
      expiresAt: expiresAt(next.expires_in),
    };
  },
};
