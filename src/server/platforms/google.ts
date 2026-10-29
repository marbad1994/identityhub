import { bearer, form, PlatformError, requestJson, withQuery } from "./http";
import type { Platform } from "./types";

/** Google identity is separate from YouTube: no channel or publishing access. */
export const google: Platform = {
  id: "google",
  envPrefix: "GOOGLE",
  pkce: true,
  authorizeUrl: ({ creds, redirectUri, state, challenge }) =>
    withQuery("https://accounts.google.com/o/oauth2/v2/auth", {
      response_type: "code",
      client_id: creds.clientId,
      redirect_uri: redirectUri,
      scope: "openid profile",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      prompt: "select_account",
    }),
  async exchange({ creds, code, redirectUri, verifier }) {
    const tokens = await requestJson("Google", "https://oauth2.googleapis.com/token", {
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
    if (typeof tokens.access_token !== "string" || !tokens.access_token)
      throw new PlatformError("Google did not return an access token. Try signing in again.");
    // Read identity directly from Google's authenticated endpoint. Do not decode
    // or trust an unverified ID token, and never identify a user by their email.
    const profile = await requestJson(
      "Google",
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: bearer(tokens.access_token),
      },
    );
    if (typeof profile.sub !== "string" || !profile.sub || profile.sub.length > 255)
      throw new PlatformError("Google did not return a valid identity. Try signing in again.");
    return {
      subject: {
        id: profile.sub,
        displayName:
          typeof profile.name === "string" && profile.name.trim() ? profile.name : "Google user",
        avatarUrl:
          typeof profile.picture === "string" && profile.picture.startsWith("https://")
            ? profile.picture
            : null,
      },
      // Login tokens are discarded. Google is never offered as a posting account.
      accounts: [],
    };
  },
};
