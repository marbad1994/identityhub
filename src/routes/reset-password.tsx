import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { checkResetToken, resetPassword } from "@/lib/api";
import { ErrorNote } from "@/components/shell";
import { AuthSurface } from "@/components/auth-surface";
import { NEW_PASSWORD_HINT, PasswordField, primaryButton } from "@/components/auth-forms";
import { useHydrated } from "@/lib/use-hydrated";

export const Route = createFileRoute("/reset-password")({
  // The token is a credential: keep it out of the Referer of anything this page loads.
  head: () => ({
    meta: [
      { title: "Choose a new password · Identity Hub" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { token: string } => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: ({ deps }) => checkResetToken({ data: { token: deps.token } }),
  component: ResetPassword,
});

function ResetPassword() {
  const { valid } = Route.useLoaderData();
  const { token } = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = useHydrated();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await resetPassword({ data: { token, password } });
      if (result.ok)
        window.location.assign(
          `/login?notice=${encodeURIComponent("Password changed. Sign in with your new password.")}`,
        );
      else setError(result.error);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthSurface
      title="Choose a new password"
      description="A fresh password for your IdentityHub account."
    >
      {!valid ? (
        <>
          <ErrorNote message="This reset link expired or was already used." />
          <p className="mt-6 text-sm">
            <Link to="/forgot-password" className="text-link no-underline hover:underline">
              Ask for a new link
            </Link>
          </p>
        </>
      ) : (
        <form method="post" onSubmit={submit} className="grid gap-4">
          <PasswordField
            label="New password"
            name="password"
            required
            minLength={15}
            maxLength={256}
            autoComplete="new-password"
            hint={NEW_PASSWORD_HINT}
          />
          <PasswordField
            label="Repeat new password"
            name="confirm"
            required
            maxLength={256}
            autoComplete="new-password"
          />
          <button type="submit" disabled={busy || !ready} className={primaryButton}>
            {busy ? "Saving password…" : "Save password"}
          </button>
          <ErrorNote message={error} />
          <p className="text-sm text-muted">
            Every device signed in to this account will be signed out.
          </p>
        </form>
      )}
    </AuthSurface>
  );
}
