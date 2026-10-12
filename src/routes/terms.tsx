import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/shell";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Service · Identity Hub" }] }),
  component: Terms,
});

function Terms() {
  return (
    <Page width="max-w-3xl">
      <h1 className="text-4xl font-semibold tracking-tight">Terms of Service</h1>
      <div className="mt-6 space-y-4 text-muted">
        <p>Identity Hub signs you in with social platforms you choose and lets you grant registered apps access to specific accounts.</p>
        <p>You may only connect accounts you are allowed to manage. Each platform's own terms continue to apply to everything you do on it.</p>
        <p>
          Developers who register an app must keep its client secret on their server, request only the access they use, and handle
          the data they receive according to their own published privacy policy.
        </p>
        <p>We may suspend an app or account that abuses a platform or another person's accounts.</p>
      </div>
    </Page>
  );
}
