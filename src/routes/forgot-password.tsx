import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requestPasswordReset } from "@/lib/api";
import { ErrorNote, Page, SuccessNote } from "@/components/shell";
import { inputClass, primaryButton } from "@/components/auth-forms";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password · Identity Hub" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const result = await requestPasswordReset({
        data: { email: String(form.get("email") ?? "") },
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
      <h1 className="text-4xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-3 text-muted">We will email you a link to choose a new one.</p>
      {sent ? (
        <SuccessNote message={sent} />
      ) : (
        <form onSubmit={submit} className="mt-8 grid gap-4">
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
          <button type="submit" disabled={busy} className={primaryButton}>
            Send reset link
          </button>
          <ErrorNote message={error} />
        </form>
      )}
    </Page>
  );
}
