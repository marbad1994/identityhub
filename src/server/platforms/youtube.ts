import { bearer, expiresAt, form, PlatformError, requestJson, withQuery } from "./http";
import type { Platform } from "./types";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";
const SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"];

export const youtube: Platform = {
  id: "youtube",
  envPrefix: "YOUTUBE",
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
      // offline asks for a refresh token; consent makes Google issue a new one
      // even for an account that already authorized this app.
      access_type: "offline",
      prompt: "consent",
    }),
  async exchange({ creds, code, redirectUri, verifier }) {
    const tokens = await requestJson("YouTube", TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        code_verifier: verifier,
      }),
    });
    const channels = await requestJson("YouTube", withQuery(CHANNELS_URL, { part: "snippet", mine: "true" }), {
      headers: bearer(tokens.access_token),
    });
    const channel = channels.items?.[0];
    if (!channel) throw new PlatformError("This Google account has no YouTube channel");
    const title = channel.snippet?.title ?? String(channel.id);
    const avatar = channel.snippet?.thumbnails?.default?.url ?? null;
    return {
      subject: { id: String(channel.id), displayName: title, avatarUrl: avatar },
      accounts: [
        {
          accountId: String(channel.id),
          handle: channel.snippet?.customUrl ?? title,
          displayName: title,
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
    if (!tokens.refreshToken) throw new Error("Reconnect the YouTube channel");
    const next = await requestJson("YouTube", TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form({ grant_type: "refresh_token", refresh_token: tokens.refreshToken, client_id: creds.clientId, client_secret: creds.clientSecret }),
    });
    return { accessToken: next.access_token, expiresAt: expiresAt(next.expires_in) };
  },
};
