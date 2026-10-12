import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy · Identity Hub" }] }),
  component: Privacy,
});

function Privacy() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Privacy Policy</h1>
        <div className="mt-6 space-y-4 text-muted">
          <p>Identity Hub stores the workspace owner’s account, registered app origins, connection handles, granted scopes, and an audit log.</p>
          <p>Live provider access and refresh tokens are encrypted with TOKEN_ENCRYPTION_KEY before they are written. They are not included in exports, the widget, or product tokens.</p>
          <p>Sandbox profiles are labels you type. They are not sent to X, Meta, TikTok, LinkedIn, Google, or Reddit.</p>
          <p>Stripe receives the billing customer id and subscription status. We do not store card numbers.</p>
          <p>To remove workspace data, use the Data Deletion page or email support@socialpostapi.makketing.com.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
