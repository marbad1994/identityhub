import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { signUp } from "@/lib/api";
import { ErrorNote, Page, SuccessNote } from "@/components/shell";
import {
  NEW_PASSWORD_HINT,
  PasswordField,
  inputClass,
  primaryButton,
} from "@/components/auth-forms";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create an account · Identity Hub" }] }),
  validateSearch: (search: Record<string, unknown>): { return_to?: string } => ({
    return_to: typeof search.return_to === "string" ? search.return_to : undefined,
  }),
  component: SignUp,
});

function SignUp() {
  const { return_to: returnTo = "/workspace" } = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const result = await signUp({
        data: {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
          returnTo,
        },
      });
      if (result.ok) setSent(result.message);
      else setError(result.error);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page width="max-w-lg">
      <h1 className="text-4xl font-semibold tracking-tight">Create an account</h1>
      {sent ? (
        <SuccessNote message={sent} />
      ) : (
        <form onSubmit={submit} className="mt-8 grid gap-4">
          <label className="block text-sm font-medium">
            Name
            <input name="name" required autoComplete="name" maxLength={80} className={inputClass} />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              maxLength={320}
              className={inputClass}
            />
          </label>
          <PasswordField
            label="Password"
            name="password"
            required
            minLength={15}
            maxLength={256}
            autoComplete="new-password"
            hint={NEW_PASSWORD_HINT}
          />
          <button type="submit" disabled={busy} className={primaryButton}>
            Create account
          </button>
          <ErrorNote message={error} />
        </form>
      )}
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link
          to="/login"
          search={{ return_to: returnTo }}
          className="text-link no-underline hover:underline"
        >
          Sign in
        </Link>
      </p>
    </Page>
  );
}
