import { bearer, expiresAt, form, requestJson, withQuery } from "./http";
import type { Platform } from "./types";

const AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const ME_URL = "https://api.twitter.com/2/users/me";
const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access", "media.write"];

// X's confidential-client (Basic auth) token exchange fails with
// "Missing valid authorization header" even when correct, so, like
// SocialPostAPI, the app runs as a public client: client_id in the body + PKCE.
export const twitter: Platform = {
  id: "twitter",
  envPrefix: "TWITTER",
  pkce: true,
  authorizeUrl: ({ creds, redirectUri, state, challenge }) =>
    withQuery(AUTHORIZE_URL, {
      response_type: "code",
      client_id: creds.clientId,
      redirect_uri: redirectUri,
      scope: SCOPES.join(" "),
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    }),
  async exchange({ creds, code, redirectUri, verifier }) {
    const tokens = await requestJson("X", TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: creds.clientId,
        code_verifier: verifier,
      }),
    });
    const me = await requestJson("X", withQuery(ME_URL, { "user.fields": "profile_image_url" }), {
      headers: bearer(tokens.access_token),
    });
    const user = me.data ?? {};
    const id = String(user.id);
    const subject = {
      id,
      displayName: user.name ?? user.username ?? id,
      avatarUrl: user.profile_image_url ?? null,
    };
    return {
      subject,
      accounts: [
        {
          accountId: id,
          handle: `@${user.username ?? id}`,
          displayName: subject.displayName,
          avatarUrl: subject.avatarUrl,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          expiresAt: expiresAt(tokens.expires_in),
          platformScopes: tokens.scope ?? SCOPES.join(" "),
        },
      ],
    };
  },
  async refresh({ creds, tokens }) {
    if (!tokens.refreshToken)
      throw new Error("X did not issue a refresh token; reconnect the account");
    const next = await requestJson("X", TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form({
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
        client_id: creds.clientId,
      }),
    });
    return {
      accessToken: next.access_token,
      refreshToken: next.refresh_token ?? tokens.refreshToken,
      expiresAt: expiresAt(next.expires_in),
    };
  },
};
