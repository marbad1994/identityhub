import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchEmbedParent, signUp } from "@/lib/api";
import { EmbedBridge } from "@/components/embed-bridge";
import { ErrorNote, SuccessNote } from "@/components/shell";
import { AuthSurface } from "@/components/auth-surface";
import { credentialFlags } from "@/lib/authorize-search";
import { useHydrated } from "@/lib/use-hydrated";
import {
  NEW_PASSWORD_HINT,
  PasswordField,
  inputClass,
  primaryButton,
} from "@/components/auth-forms";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create an account · Identity Hub" }] }),
  validateSearch: (search: Record<string, unknown>) => credentialFlags(search),
  loaderDeps: ({ search }) => ({
    returnTo: search.return_to,
    parentOrigin: search.parent_origin,
    embed: search.embed,
  }),
  loader: ({ deps }) =>
    fetchEmbedParent({ data: { returnTo: deps.returnTo, parentOrigin: deps.parentOrigin } }),
  component: SignUp,
});

function SignUp() {
  const {
    return_to: returnTo = "/workspace",
    embed: embedFlag,
    parent_origin: parentOrigin,
  } = Route.useSearch();
  const parent = Route.useLoaderData();
  const embed = embedFlag === 1;
  const linkSearch = embed
    ? {
        return_to: returnTo,
        embed: 1 as const,
        ...(parentOrigin ? { parent_origin: parentOrigin } : {}),
      }
    : { return_to: returnTo };
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
    <AuthSurface
      embed={embed}
      appName={parent.appName ?? "IdentityHub"}
      appearance={parent.appearance}
      title="Create an account"
      description={`A fresh start. One account for ${parent.appName ?? "the Makketing suite"}.`}
    >
      {embed ? (
        <EmbedBridge parentOrigin={parentOrigin} allowed={parent.allowed} dismissOnEscape />
      ) : null}
      {sent ? (
        <SuccessNote message={sent} />
      ) : (
        <form method="post" onSubmit={submit} className="grid gap-4">
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
          <button type="submit" disabled={busy || !ready} className={primaryButton}>
            {busy ? "Creating account…" : "Create account"}
          </button>
          <ErrorNote message={error} />
        </form>
      )}
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link to="/login" search={linkSearch} className="ih-text-link">
          Sign in
        </Link>
      </p>
    </AuthSurface>
  );
}
