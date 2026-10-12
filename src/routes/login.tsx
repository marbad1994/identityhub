import { createFileRoute } from "@tanstack/react-router";
import { SIGN_IN_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { SiteFooter, SiteHeader } from "@/components/shell";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · Identity Hub" }] }),
  component: Login,
});

function Login() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-5 py-16">
        <div className="w-full rounded-card border border-line bg-bg p-8 shadow-card">
          <p className="text-sm font-semibold text-muted">Identity Hub</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted">Choose a platform. This is the workspace owner, not a connected social profile.</p>
          <div className="mt-6 grid gap-2">
            {authEnabled ? (
              SIGN_IN_PROVIDERS.map((provider) => (
                <button
                  key={provider.providerId}
                  type="button"
                  onClick={() => signIn(provider.providerId, { callbackURL: "/workspace" })}
                  className="min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink"
                >
                  Continue with {provider.label}
                </button>
              ))
            ) : (
              <p className="text-sm text-muted">Sign-in is not enabled on this build.</p>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
