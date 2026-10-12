import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { deleteMyData } from "@/lib/api";
import { ErrorNote, Page, useSession } from "@/components/shell";

// Linked from each platform's app settings as the data deletion URL.
export const Route = createFileRoute("/deletion")({
  head: () => ({ meta: [{ title: "Data Deletion · Identity Hub" }] }),
  component: Deletion,
});

function Deletion() {
  const { user } = useSession();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Page width="max-w-3xl">
      <h1 className="text-4xl font-semibold tracking-tight">Data Deletion</h1>
      <p className="mt-4 text-muted">
        Deleting your Identity Hub account removes your profile, every connected account and its tokens, every app grant and
        token, any apps you registered, and your activity log. It does not delete anything on the platforms themselves; remove the
        app there too if you want the platform to forget the authorization.
      </p>
      {done ? (
        <p className="mt-6 font-medium text-ok">Your data was deleted.</p>
      ) : user ? (
        <button
          type="button"
          className="mt-6 min-h-11 rounded-full bg-danger px-5 text-sm font-semibold text-on-ink"
          onClick={async () => {
            if (!confirm("Delete your Identity Hub account and all its data? This cannot be undone.")) return;
            setError(null);
            try {
              await deleteMyData();
              setDone(true);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Could not delete the account.");
            }
          }}
        >
          Delete my account and data
        </button>
      ) : (
        <p className="mt-6 text-muted">Sign in with the account you want removed, then come back here. Or email support@makketing.com.</p>
      )}
      <ErrorNote message={error} />
    </Page>
  );
}
