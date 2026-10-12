import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ErrorNote, Page } from "@/components/shell";
import { useSession } from "@/lib/session";
import { PlatformButtons } from "@/components/platform-buttons";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · Identity Hub" }] }),
  validateSearch: (search: Record<string, unknown>): { return_to?: string; error?: string } => ({
    return_to: typeof search.return_to === "string" ? search.return_to : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  component: Login,
});

function Login() {
  const { user, platforms } = useSession();
  const { return_to: returnTo = "/workspace", error } = Route.useSearch();
  if (user && !error) return <Navigate to="/workspace" />;
  return (
    <Page width="max-w-lg">
      <h1 className="text-4xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-3 text-muted">
        Use any platform you post on. The account you sign in with is connected too, and you can add
        more afterwards.
      </p>
      <ErrorNote message={error} />
      <div className="mt-8">
        <PlatformButtons
          platforms={platforms}
          intent="login"
          returnTo={returnTo}
          verb="Continue with"
        />
      </div>
    </Page>
  );
}
