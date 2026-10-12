import { expiresAt, requestJson, withQuery } from "./http";
import type { Platform } from "./types";

const AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const LONG_LIVED_URL = "https://graph.instagram.com/access_token";
const REFRESH_URL = "https://graph.instagram.com/refresh_access_token";
const ME_URL = "https://graph.instagram.com/v21.0/me";
const SCOPES = ["instagram_business_basic", "instagram_business_content_publish"];

export const instagram: Platform = {
  id: "instagram",
  envPrefix: "INSTAGRAM",
  pkce: false,
  authorizeUrl: ({ creds, redirectUri, state }) =>
    withQuery(AUTHORIZE_URL, {
      client_id: creds.clientId,
      redirect_uri: redirectUri,
      scope: SCOPES.join(","),
      response_type: "code",
      state,
    }),
  async exchange({ creds, code, redirectUri }) {
    // The token endpoint needs multipart/form-data; urlencoded yields a
    // misleading redirect_uri mismatch error.
    const body = new FormData();
    body.set("client_id", creds.clientId);
    body.set("client_secret", creds.clientSecret);
    body.set("grant_type", "authorization_code");
    body.set("redirect_uri", redirectUri);
    body.set("code", code);
    const short = await requestJson("Instagram", TOKEN_URL, { method: "POST", body });
    // Trade the short-lived token for a long-lived one (about 60 days).
    const long = await requestJson(
      "Instagram",
      withQuery(LONG_LIVED_URL, {
        grant_type: "ig_exchange_token",
        client_secret: creds.clientSecret,
        access_token: short.access_token,
      }),
    );
    const accessToken: string = long.access_token ?? short.access_token;
    const me = await requestJson(
      "Instagram",
      withQuery(ME_URL, { fields: "id,username,profile_picture_url", access_token: accessToken }),
    );
    const id = String(me.id ?? short.user_id);
    const handle = me.username ?? id;
    return {
      subject: { id, displayName: handle, avatarUrl: me.profile_picture_url ?? null },
      accounts: [
        {
          accountId: id,
          handle: `@${handle}`,
          displayName: handle,
          avatarUrl: me.profile_picture_url ?? null,
          accessToken,
          // Instagram renews the access token itself (see refresh).
          refreshToken: null,
          expiresAt: expiresAt(long.expires_in),
          platformScopes: SCOPES.join(","),
        },
      ],
    };
  },
  async refresh({ tokens }) {
    const next = await requestJson(
      "Instagram",
      withQuery(REFRESH_URL, { grant_type: "ig_refresh_token", access_token: tokens.accessToken }),
    );
    return { accessToken: next.access_token, expiresAt: expiresAt(next.expires_in) };
  },
};
