import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { eraseHub } from "@/lib/broker/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SiteFooter, SiteHeader } from "@/components/shell";

export const Route = createFileRoute("/deletion")({
  head: () => ({ meta: [{ title: "Data Deletion · Identity Hub" }] }),
  component: Deletion,
});

function Deletion() {
  const { user, isPending } = useCurrentUserState();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Data Deletion</h1>
        <p className="mt-4 text-muted">
          This removes your workspace: apps, connections, grants, audit events, and the Stripe customer reference stored here. It does not delete the sign-in account at Google or X, and it asks the platform to revoke a refresh token only when one was stored.
        </p>
        {isPending ? <p className="mt-6 text-muted">Checking session…</p> : null}
        {!isPending && !user ? <p className="mt-6 text-muted">Sign in, then come back to delete the workspace tied to that account. Or email support@socialpostapi.makketing.com.</p> : null}
        {!isPending && user && !done ? (
          <button
            type="button"
            className="mt-6 min-h-11 rounded-full bg-danger px-5 text-sm font-semibold text-on-ink"
            onClick={async () => {
              setError(null);
              try {
                await eraseHub();
                setDone(true);
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Could not delete the workspace.");
              }
            }}
          >
            Delete my workspace data
          </button>
        ) : null}
        {done ? <p className="mt-6 text-ok">Workspace data was deleted.</p> : null}
        {error ? <p role="alert" className="mt-4 text-sm text-danger">{error}</p> : null}
      </main>
      <SiteFooter />
    </>
  );
}
