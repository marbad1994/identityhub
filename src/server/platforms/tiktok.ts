import { bearer, expiresAt, form, PlatformError, requestJson, withQuery } from "./http";
import type { Platform } from "./types";

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const ME_URL = "https://open.tiktokapis.com/v2/user/info/";
const SCOPES = ["user.info.basic", "video.publish", "video.upload"];

// TikTok calls the client id `client_key`, and can answer 200 with an error body.
function assertOk(tokens: Record<string, any>) {
  if (tokens.error && tokens.error !== "ok") {
    throw new PlatformError(`TikTok rejected the request: ${tokens.error_description ?? tokens.error}`);
  }
}

export const tiktok: Platform = {
  id: "tiktok",
  envPrefix: "TIKTOK",
  pkce: true,
  authorizeUrl: ({ creds, redirectUri, state, challenge }) =>
    withQuery(AUTHORIZE_URL, {
      client_key: creds.clientId,
      scope: SCOPES.join(","),
      response_type: "code",
      redirect_uri: redirectUri,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    }),
  async exchange({ creds, code, redirectUri, verifier }) {
    const tokens = await requestJson("TikTok", TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form({
        client_key: creds.clientId,
        client_secret: creds.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });
    assertOk(tokens);
    const me = await requestJson("TikTok", withQuery(ME_URL, { fields: "open_id,display_name,avatar_url" }), {
      headers: bearer(tokens.access_token),
    });
    const user = me.data?.user ?? {};
    const id = String(user.open_id ?? tokens.open_id);
    const name = user.display_name ?? id;
    return {
      subject: { id, displayName: name, avatarUrl: user.avatar_url ?? null },
      accounts: [
        {
          accountId: id,
          handle: name,
          displayName: name,
          avatarUrl: user.avatar_url ?? null,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          expiresAt: expiresAt(tokens.expires_in),
          platformScopes: tokens.scope ?? SCOPES.join(","),
        },
      ],
    };
  },
  async refresh({ creds, tokens }) {
    if (!tokens.refreshToken) throw new Error("Reconnect the TikTok account");
    const next = await requestJson("TikTok", TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form({
        client_key: creds.clientId,
        client_secret: creds.clientSecret,
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
      }),
    });
    assertOk(next);
    return { accessToken: next.access_token, refreshToken: next.refresh_token ?? tokens.refreshToken, expiresAt: expiresAt(next.expires_in) };
  },
};
