import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchEmbedParent, requestPasswordReset } from "@/lib/api";
import { credentialFlags } from "@/lib/authorize-search";
import { useHydrated } from "@/lib/use-hydrated";
import { EmbedBridge } from "@/components/embed-bridge";
import { ErrorNote, SuccessNote } from "@/components/shell";
import { AuthSurface } from "@/components/auth-surface";
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
    fetchEmbedParent({ data: { returnTo: deps.returnTo, parentOrigin: deps.parentOrigin } }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const { return_to: returnTo, embed: embedFlag, parent_origin: parentOrigin } = Route.useSearch();
  const parent = Route.useLoaderData();
  const embed = embedFlag === 1;
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = useHydrated();

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
    <AuthSurface
      embed={embed}
      appName={parent.appName ?? "IdentityHub"}
      appearance={parent.appearance}
      title="Reset your password"
      description="A little help getting in. We'll email you a link to choose a new password."
    >
      {embed ? (
        <EmbedBridge parentOrigin={parentOrigin} allowed={parent.allowed} dismissOnEscape />
      ) : null}
      {embed && sent ? (
        <EmbedBridge parentOrigin={parentOrigin} allowed={parent.allowed} type="reset-sent" />
      ) : null}
      {sent ? (
        <SuccessNote
          message={
            embed
              ? "The link opens in a new tab. This sign-in will not finish. After you change the password, start again from the site."
              : sent
          }
        />
      ) : (
        <form method="post" onSubmit={submit} className="grid gap-4">
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
          <button type="submit" disabled={busy || !ready} className={primaryButton}>
            {busy ? "Sending link…" : "Send reset link"}
          </button>
          <ErrorNote message={error} />
        </form>
      )}
      <p className="ih-signup">
        <Link
          to="/login"
          search={{
            return_to: returnTo,
            ...(embed ? { embed: 1 as const, parent_origin: parentOrigin } : {}),
          }}
          className="ih-text-link"
        >
          Back to sign-in
        </Link>
      </p>
    </AuthSurface>
  );
}
