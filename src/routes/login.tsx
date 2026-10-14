import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ErrorNote, Page, SuccessNote } from "@/components/shell";
import { useSession } from "@/lib/session";
import { PlatformButtons } from "@/components/platform-buttons";
import { Divider, PasswordLogin } from "@/components/auth-forms";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · Identity Hub" }] }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { return_to?: string; error?: string; notice?: string } => ({
    return_to: typeof search.return_to === "string" ? search.return_to : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    notice: typeof search.notice === "string" ? search.notice : undefined,
  }),
  component: Login,
});

function Login() {
  const { user, methods } = useSession();
  const { return_to: returnTo = "/workspace", error, notice } = Route.useSearch();
  if (user && !error) return <Navigate to="/workspace" />;
  const platforms = methods.filter((method) => method.id !== "password");
  const password = methods.some((method) => method.id === "password");
  return (
    <Page width="max-w-lg">
      <h1 className="text-4xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-3 text-muted">Use a platform you post on, or your email and password.</p>
      <ErrorNote message={error} />
      <SuccessNote message={notice} />
      {methods.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No sign-in method is configured on this hub yet.</p>
      ) : null}
      <div className="mt-8">
        <PlatformButtons
          platforms={platforms}
          intent="login"
          returnTo={returnTo}
          verb="Continue with"
        />
      </div>
      {password ? (
        <>
          {platforms.length > 0 ? <Divider label="or with email" /> : <div className="mt-8" />}
          <PasswordLogin returnTo={returnTo} />
        </>
      ) : null}
    </Page>
  );
}
