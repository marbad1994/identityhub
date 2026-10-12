import { basicAuth, bearer, expiresAt, form, requestJson, withQuery } from "./http";
import type { Platform } from "./types";

const AUTHORIZE_URL = "https://accounts.snapchat.com/accounts/oauth2/auth";
const TOKEN_URL = "https://accounts.snapchat.com/accounts/oauth2/token";
const ME_URL = "https://kit.snapchat.com/v1/me";
const SCOPES = [
  "https://auth.snapchat.com/oauth2/api/user.external_id",
  "https://auth.snapchat.com/oauth2/api/user.display_name",
  "https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar",
];

/**
 * Snap Login Kit: identity only. Snapchat has no API for posting on a
 * person's behalf, so a Snapchat connection only ever carries `profile`.
 */
export const snapchat: Platform = {
  id: "snapchat",
  envPrefix: "SNAPCHAT",
  pkce: true,
  authorizeUrl: ({ creds, redirectUri, state, challenge }) =>
    withQuery(AUTHORIZE_URL, {
      client_id: creds.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES.join(" "),
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    }),
  async exchange({ creds, code, redirectUri, verifier }) {
    const tokens = await requestJson("Snapchat", TOKEN_URL, {
      method: "POST",
      headers: {
        authorization: basicAuth(creds.clientId, creds.clientSecret),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });
    const me = await requestJson(
      "Snapchat",
      withQuery(ME_URL, { query: "{me{externalId displayName bitmoji{avatar}}}" }),
      {
        headers: bearer(tokens.access_token),
      },
    );
    const user = me.data?.me ?? {};
    const id = String(user.externalId);
    const name = user.displayName ?? "Snapchat user";
    const avatar = user.bitmoji?.avatar ?? null;
    return {
      subject: { id, displayName: name, avatarUrl: avatar },
      accounts: [
        {
          accountId: id,
          handle: name,
          displayName: name,
          avatarUrl: avatar,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          expiresAt: expiresAt(tokens.expires_in),
          platformScopes: SCOPES.join(" "),
        },
      ],
    };
  },
};
