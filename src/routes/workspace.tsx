import { createFileRoute } from "@tanstack/react-router";
import { SIGN_IN_PROVIDERS, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SiteFooter, SiteHeader } from "@/components/shell";
import { WorkspaceView } from "@/components/workspace-view";

export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [{ title: "Workspace · Identity Hub" }],
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const { user, isPending } = useCurrentUserState();
  return (
    <>
      <SiteHeader />
      <main>
        {isPending ? <p className="mx-auto max-w-6xl px-5 py-16 text-muted">Loading workspace…</p> : null}
        {!isPending && !user ? (
          <section className="mx-auto max-w-md px-5 py-20">
            <h1 className="text-3xl font-semibold tracking-tight">Sign in to the workspace</h1>
            <p className="mt-2 text-sm text-muted">Connections and grants belong to the signed-in owner.</p>
            <div className="mt-6 grid gap-2">
              {SIGN_IN_PROVIDERS.map((provider) => (
                <button
                  key={provider.providerId}
                  type="button"
                  className="min-h-11 rounded-full bg-ink text-sm font-semibold text-on-ink"
                  onClick={() => signIn(provider.providerId, { callbackURL: "/workspace" })}
                >
                  Continue with {provider.label}
                </button>
              ))}
            </div>
          </section>
        ) : null}
        {!isPending && user ? <WorkspaceView /> : null}
      </main>
      <SiteFooter />
    </>
  );
}
