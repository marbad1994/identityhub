import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy · Identity Hub" }] }),
  component: Privacy,
});

function Privacy() {
  return (
    <Page width="max-w-3xl">
      <h1 className="text-4xl font-semibold tracking-tight">Privacy Policy</h1>
      <div className="mt-6 space-y-4 text-muted">
        <p>
          When you sign in or connect an account, Identity Hub stores the platform account id, name,
          handle and picture the platform returns, plus its access and refresh tokens. Tokens are
          encrypted with AES-256-GCM before they are written.
        </p>
        <p>
          An app you authorize receives your Identity Hub user id, name and picture, and the name,
          handle and picture of the accounts you chose. Only for accounts granted with publish
          access can the app request that account's platform access token, from its server, to post
          on your behalf.
        </p>
        <p>
          We keep a log of sign-ins, connections and grants so you can see who has access. We do not
          sell data.
        </p>
        <p>
          Disconnecting an account or removing an app takes effect immediately. To delete
          everything, use the Data Deletion page or email support@makketing.com.
        </p>
      </div>
    </Page>
  );
}
