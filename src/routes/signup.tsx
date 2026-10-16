import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchEmbedParent, signUp } from "@/lib/api";
import { EmbedBridge } from "@/components/embed-bridge";
import { ErrorNote, Page, SuccessNote } from "@/components/shell";
import { credentialFlags } from "@/lib/authorize-search";
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
    deps.embed === 1
      ? fetchEmbedParent({ data: { returnTo: deps.returnTo, parentOrigin: deps.parentOrigin } })
      : Promise.resolve({ allowed: false, appName: null as string | null }),
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
    <Page width="max-w-lg" embed={embed}>
      {embed ? (
        <EmbedBridge parentOrigin={parentOrigin} allowed={parent.allowed} dismissOnEscape />
      ) : null}
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
        <Link to="/login" search={linkSearch} className="text-link no-underline hover:underline">
          Sign in
        </Link>
      </p>
    </Page>
  );
}
