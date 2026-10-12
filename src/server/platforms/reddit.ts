import { basicAuth, expiresAt, form, requestJson, USER_AGENT, withQuery } from "./http";
import type { Platform } from "./types";

const AUTHORIZE_URL = "https://www.reddit.com/api/v1/authorize";
const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const ME_URL = "https://oauth.reddit.com/api/v1/me";
const SCOPES = ["identity", "submit", "read", "edit", "privatemessages"];

export const reddit: Platform = {
  id: "reddit",
  envPrefix: "REDDIT",
  pkce: false,
  authorizeUrl: ({ creds, redirectUri, state }) =>
    withQuery(AUTHORIZE_URL, {
      client_id: creds.clientId,
      response_type: "code",
      state,
      redirect_uri: redirectUri,
      duration: "permanent",
      scope: SCOPES.join(" "),
    }),
  async exchange({ creds, code, redirectUri }) {
    const tokens = await requestJson("Reddit", TOKEN_URL, {
      method: "POST",
      headers: {
        authorization: basicAuth(creds.clientId, creds.clientSecret),
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": USER_AGENT,
      },
      body: form({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    });
    const user = await requestJson("Reddit", ME_URL, {
      headers: { authorization: `Bearer ${tokens.access_token}`, "user-agent": USER_AGENT },
    });
    const id = String(user.id);
    const name = user.name ?? id;
    const avatar = typeof user.icon_img === "string" && user.icon_img ? user.icon_img.split("?")[0] : null;
    return {
      subject: { id, displayName: name, avatarUrl: avatar },
      accounts: [
        {
          accountId: id,
          handle: `u/${name}`,
          displayName: name,
          avatarUrl: avatar,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          expiresAt: expiresAt(tokens.expires_in),
          platformScopes: tokens.scope ?? SCOPES.join(" "),
        },
      ],
    };
  },
  async refresh({ creds, tokens }) {
    if (!tokens.refreshToken) throw new Error("Reconnect the Reddit account");
    const next = await requestJson("Reddit", TOKEN_URL, {
      method: "POST",
      headers: {
        authorization: basicAuth(creds.clientId, creds.clientSecret),
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": USER_AGENT,
      },
      body: form({ grant_type: "refresh_token", refresh_token: tokens.refreshToken }),
    });
    return { accessToken: next.access_token, expiresAt: expiresAt(next.expires_in) };
  },
};
