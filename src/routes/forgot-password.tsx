import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { fetchEmbedParent, requestPasswordReset } from "@/lib/api";
import { credentialFlags } from "@/lib/authorize-search";
import { EmbedBridge } from "@/components/embed-bridge";
import { ErrorNote, Page, SuccessNote } from "@/components/shell";
import { inputClass, primaryButton } from "@/components/auth-forms";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password · Identity Hub" }] }),
  validateSearch: (search: Record<string, unknown>) => credentialFlags(search),
  loaderDeps: ({ search }) => ({
    returnTo: search.return_to,
    parentOrigin: search.parent_origin,
    embed: search.embed,
  }),
  loader: ({ deps }) =>
    deps.embed === 1
      ? fetchEmbedParent({ data: { returnTo: deps.returnTo, parentOrigin: deps.parentOrigin } })
      : Promise.resolve({ allowed: false, appName: null as string | null }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const { embed: embedFlag, parent_origin: parentOrigin } = Route.useSearch();
  const parent = Route.useLoaderData();
  const embed = embedFlag === 1;
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
    <Page width="max-w-lg" embed={embed}>
      {embed ? (
        <EmbedBridge parentOrigin={parentOrigin} allowed={parent.allowed} dismissOnEscape />
      ) : null}
      {embed && sent ? (
        <EmbedBridge parentOrigin={parentOrigin} allowed={parent.allowed} type="reset-sent" />
      ) : null}
      <h1 className="text-4xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-3 text-muted">We will email you a link to choose a new one.</p>
      {sent ? (
        <SuccessNote
          message={
            embed
              ? "The link opens in a new tab. This sign-in will not finish. After you change the password, start again from the site."
              : sent
          }
        />
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
