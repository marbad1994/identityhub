import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/shell";

export const Route = createFileRoute("/docs")({
  head: () => ({ meta: [{ title: "Docs · Identity Hub" }] }),
  component: Docs,
});

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto whitespace-pre rounded-2xl bg-ink p-4 font-sans text-sm leading-relaxed text-on-ink">
      {children}
    </pre>
  );
}

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 space-y-3 text-muted">{children}</div>
    </section>
  );
}

function Docs() {
  return (
    <Page width="max-w-3xl">
      <h1 className="text-4xl font-semibold tracking-tight">Integrate an app</h1>
      <p className="mt-3 text-muted">
        Identity Hub is an OAuth 2.0 authorization server. People sign in with a social platform,
        and your app receives their identity plus the accounts they chose to share. Platform tokens
        stay on the hub; your server asks for one only when it needs to publish.
      </p>

      <Step title="1. Register the app">
        <p>
          Sign in, open the workspace and register the app with its homepage and exact redirect
          URIs. Copy the client secret when it is shown; it is stored only as a hash.
        </p>
      </Step>

      <Step title="2. Send the person to the hub">
        <p>
          Redirect the browser to <strong>/authorize</strong>. Use a fresh random state and check it
          when they come back. Scope is
          <strong> profile</strong>, <strong>publish</strong> or both, space separated.
        </p>
        <Code>{`GET {HUB}/authorize
  ?client_id=ihub_pk_...
  &redirect_uri=https://socialpostapi.makketing.com/auth/identityhub/callback
  &scope=profile publish
  &state=RANDOM`}</Code>
        <p>
          They sign in (if needed), pick accounts and allow. The hub redirects to your redirect URI
          with
          <strong> code</strong> and <strong>state</strong>, or with{" "}
          <strong>error=access_denied</strong>.
        </p>
      </Step>

      <Step title="3. Exchange the code on your server">
        <p>
          Codes are single use and expire after ten minutes. Client credentials go in the body or
          HTTP Basic auth.
        </p>
        <Code>{`POST {HUB}/api/v1/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=code_...&redirect_uri=...
&client_id=ihub_pk_...&client_secret=ihub_sk_...`}</Code>
        <Code>{`{
  "access_token": "ihub_at_...",
  "token_type": "Bearer",
  "user": { "id": "...", "display_name": "...", "avatar_url": "..." },
  "accounts": [
    { "id": "...", "platform": "twitter", "platform_account_id": "...",
      "handle": "@studio", "display_name": "Studio", "avatar_url": "...",
      "scopes": ["profile", "publish"] }
  ]
}`}</Code>
        <p>
          The access token does not expire. Store it server side; it stops working when the person
          removes your app or you revoke it. Use <strong>user.id</strong> as the stable id for your
          own user record.
        </p>
      </Step>

      <Step title="4. Read the current grant">
        <Code>{`GET {HUB}/api/v1/me
Authorization: Bearer ihub_at_...`}</Code>
        <p>
          Same user and accounts shape as the token response. Accounts the person disconnected or
          un-shared are gone.
        </p>
      </Step>

      <Step title="5. Get a platform token to publish">
        <p>
          For an account granted with publish, the hub returns a current platform access token,
          refreshing it first when it is about to expire. Call it right before each platform request
          instead of storing the result.
        </p>
        <Code>{`POST {HUB}/api/v1/accounts/{account id}/token
Authorization: Bearer ihub_at_...

{ "access_token": "...", "expires_at": "2026-10-12T14:00:00.000Z",
  "platform": "facebook", "platform_account_id": "1234" }`}</Code>
        <p>
          403 insufficient_scope means publish was not granted. 409 reconnect_required means the
          platform refused a refresh; ask the person to reconnect the account in Identity Hub.
        </p>
      </Step>

      <Step title="6. Revoke">
        <Code>{`POST {HUB}/api/v1/oauth/revoke
token=ihub_at_...&client_id=ihub_pk_...&client_secret=ihub_sk_...`}</Code>
      </Step>

      <Step title="Errors">
        <p>
          Errors are JSON:{" "}
          <strong>{`{ "error": "invalid_client", "error_description": "..." }`}</strong>. Codes:
          invalid_client (401), invalid_grant (400), unsupported_grant_type (400), invalid_token
          (401), insufficient_scope (403), not_found (404), reconnect_required (409).
        </p>
      </Step>

      <Step title="Platforms">
        <p>
          X, Instagram, Facebook (one account per Page), TikTok, LinkedIn, YouTube and Reddit
          support profile and publish. Snapchat is sign-in only: Snap offers no API for posting, so
          its accounts only ever carry profile.
        </p>
      </Step>
    </Page>
  );
}
