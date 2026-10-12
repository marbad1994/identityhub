import { env } from "../env";
import { expiresAt, requestJson, withQuery } from "./http";
import type { Platform } from "./types";

const AUTHORIZE_URL = "https://www.facebook.com/v21.0/dialog/oauth";
const TOKEN_URL = "https://graph.facebook.com/v21.0/oauth/access_token";
const API = "https://graph.facebook.com/v21.0";
const SCOPES = ["public_profile", "pages_show_list", "pages_read_engagement", "pages_manage_posts", "pages_manage_metadata"];

/**
 * Signing in identifies the Facebook user; the accounts it unlocks are the
 * Pages that user manages, one per Page, each with its own Page token.
 */
export const facebook: Platform = {
  id: "facebook",
  envPrefix: "FACEBOOK",
  pkce: false,
  authorizeUrl: ({ creds, redirectUri, state }) => {
    // A Login Configuration (Facebook Login for Business) is what makes the
    // Page picker appear. Without one, fall back to plain scopes.
    const configId = env("FACEBOOK_LOGIN_CONFIG_ID");
    return withQuery(AUTHORIZE_URL, {
      client_id: creds.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
      ...(configId ? { config_id: configId } : { scope: SCOPES.join(",") }),
      // Re-show the Page picker even when a previous grant shared no Pages.
      auth_type: "rerequest",
    });
  },
  async exchange({ creds, code, redirectUri }) {
    const short = await requestJson(
      "Facebook",
      withQuery(TOKEN_URL, { client_id: creds.clientId, client_secret: creds.clientSecret, redirect_uri: redirectUri, code }),
    );
    const long = await requestJson(
      "Facebook",
      withQuery(TOKEN_URL, {
        grant_type: "fb_exchange_token",
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        fb_exchange_token: short.access_token,
      }),
    );
    const userToken: string = long.access_token;
    const me = await requestJson("Facebook", withQuery(`${API}/me`, { fields: "id,name,picture", access_token: userToken }));
    const pages = await requestJson(
      "Facebook",
      withQuery(`${API}/me/accounts`, { fields: "id,name,access_token,picture", access_token: userToken }),
    );
    return {
      subject: { id: String(me.id), displayName: me.name ?? String(me.id), avatarUrl: me.picture?.data?.url ?? null },
      accounts: ((pages.data ?? []) as any[]).map((page) => ({
        accountId: String(page.id),
        handle: page.name ?? String(page.id),
        displayName: page.name ?? String(page.id),
        avatarUrl: page.picture?.data?.url ?? null,
        accessToken: page.access_token,
        // Page tokens from a long-lived user token do not expire on their own;
        // the user token is kept to re-derive a fresh Page token.
        refreshToken: userToken,
        expiresAt: expiresAt(long.expires_in),
        platformScopes: SCOPES.join(","),
      })),
    };
  },
  async refresh({ tokens }) {
    if (!tokens.refreshToken) throw new Error("Reconnect the Facebook Page");
    const pages = await requestJson(
      "Facebook",
      withQuery(`${API}/me/accounts`, { fields: "id,access_token", access_token: tokens.refreshToken }),
    );
    const page = ((pages.data ?? []) as any[]).find((item) => String(item.id) === tokens.accountId);
    if (!page) throw new Error("The Page is no longer accessible; reconnect Facebook");
    return { accessToken: page.access_token, expiresAt: null };
  },
};
