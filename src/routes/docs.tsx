import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/shell";

export const Route = createFileRoute("/docs")({
  head: () => ({ meta: [{ title: "Docs · Identity Hub" }] }),
  component: Docs,
});

const exchange = `curl -X POST https://YOUR_APP_ORIGIN/api/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "client_id": "ihub_pk_...",
    "client_secret": "ihub_sk_...",
    "code": "code_..."
  }'`;

const widget = `IdentityHub.mount("#identity-hub", {
  appName: "SocialPostAPI",
  clientId: "ihub_pk_...",
  redirectUri: "https://socialpostapi.makketing.com",
  mode: "live",
  hubOrigin: "https://YOUR_APP_ORIGIN"
});`;

function Docs() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-sm font-semibold text-muted">API</p>
        <h1 className="mt-2 text-5xl font-semibold tracking-tight">Connect. Grant. Exchange.</h1>
        <ol className="mt-10 space-y-8">
          <li>
            <h2 className="text-2xl font-semibold tracking-tight">1. Register the product</h2>
            <p className="mt-2 text-muted">In the workspace, register the https origin. Copy the client id and the one-time client secret.</p>
          </li>
          <li>
            <h2 className="text-2xl font-semibold tracking-tight">2. Send the person to the hub</h2>
            <p className="mt-2 text-muted">The widget, in live mode, opens the consent screen. Sandbox mode still selects platforms without a login.</p>
            <pre className="mt-4 overflow-x-auto rounded-card bg-ink p-5 text-sm leading-relaxed text-on-ink">{widget}</pre>
          </li>
          <li>
            <h2 className="text-2xl font-semibold tracking-tight">3. Exchange the code</h2>
            <p className="mt-2 text-muted">Your server, not the browser, trades the code for a one-hour hub token. Provider tokens stay encrypted on the hub.</p>
            <pre className="mt-4 overflow-x-auto rounded-card bg-ink p-5 text-sm leading-relaxed text-on-ink">{exchange}</pre>
          </li>
          <li>
            <h2 className="text-2xl font-semibold tracking-tight">4. Read the connection</h2>
            <p className="mt-2 text-muted">GET /api/oauth/introspect with Authorization: Bearer returns provider, handle, and scopes. It does not return the platform token.</p>
          </li>
        </ol>
      </main>
      <SiteFooter />
    </>
  );
}
