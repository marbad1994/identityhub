import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ErrorNote, SuccessNote } from "@/components/shell";
import { AuthSurface, AuthPrivacyNote } from "@/components/auth-surface";
import { EmbedBridge, postEmbed, reportEmbed } from "@/components/embed-bridge";
import { useSession } from "@/lib/session";
import { PasswordLogin, SignInChoices } from "@/components/auth-forms";
import { fetchEmbedParent } from "@/lib/api";
import { credentialFlags } from "@/lib/authorize-search";
import { openPopup } from "@/lib/popup";
import { useHydrated } from "@/lib/use-hydrated";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · Identity Hub" }] }),
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    return_to?: string;
    embed?: 1;
    embed_wait?: 1;
    parent_origin?: string;
    error?: string;
    notice?: string;
  } => ({
    ...credentialFlags(search),
    error: typeof search.error === "string" ? search.error : undefined,
    notice: typeof search.notice === "string" ? search.notice : undefined,
  }),
  loaderDeps: ({ search }) => ({
    returnTo: search.return_to,
    parentOrigin: search.parent_origin,
    embed: search.embed,
  }),
  loader: ({ deps }) =>
    fetchEmbedParent({ data: { returnTo: deps.returnTo, parentOrigin: deps.parentOrigin } }),
  component: Login,
});

function authorizeUrl(path: string): string | null {
  if (!path.startsWith("/authorize?") && path !== "/authorize") return null;
  if (path.startsWith("//") || path.includes("\\")) return null;
  // Render runs on the server. The click that opens the popup is in the browser.
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).href;
}

function Login() {
  const { user, methods } = useSession();
  const {
    return_to: returnTo = "/workspace",
    error,
    notice,
    embed: embedFlag,
    embed_wait: embedWait,
    parent_origin: parentOrigin,
  } = Route.useSearch();
  const parent = Route.useLoaderData();
  const embed = embedFlag === 1;
  const ready = useHydrated();

  if (embedWait === 1) {
    return (
      <AuthSurface
        title="Finishing sign-in…"
        description="Keep this window open while we prepare your secure sign-in."
      >
        <p role="status" className="text-center text-sm text-muted">
          Please wait…
        </p>
      </AuthSurface>
    );
  }

  const query = returnTo.indexOf("?");
  const methodId =
    query === -1
      ? undefined
      : (new URLSearchParams(returnTo.slice(query + 1)).get("method") ?? undefined);
  const platform = methods.find((method) => method.id === methodId);
  const password = methods.some((method) => method.id === "password");
  const invalidLink = authorizeUrl(returnTo) === null;
  const openConsent = () => {
    const url = authorizeUrl(returnTo);
    if (!url || typeof window === "undefined") return;
    const popup = openPopup(url);
    if (!popup) {
      reportEmbed("popup-blocked");
      postEmbed(parentOrigin, parent.allowed, "popup-blocked");
    }
  };

  if (embed && user && !error) {
    return (
      <AuthSurface
        embed
        appName={parent.appName ?? "IdentityHub"}
        appearance={parent.appearance}
        title="Good to see you."
        description={`Continue to finish signing in to ${parent.appName ?? "the app"}.`}
      >
        <EmbedBridge parentOrigin={parentOrigin} allowed={parent.allowed} dismissOnEscape />
        <button
          type="button"
          disabled={!ready}
          className="ih-primary ih-accent"
          onClick={openConsent}
        >
          Continue
        </button>
        {invalidLink ? <ErrorNote message="This sign-in link is not valid." /> : null}
        <AuthPrivacyNote />
      </AuthSurface>
    );
  }

  if (user && !error) return <Navigate to="/workspace" />;

  return (
    <AuthSurface
      embed={embed}
      appName={parent.appName ?? "IdentityHub"}
      appearance={parent.appearance}
      title={`Welcome to ${parent.appName ?? "IdentityHub"}`}
      description={
        embed && platform?.id === "password"
          ? "Good to see you. Continue with your email."
          : "Sign in your way. We'll take it from here."
      }
    >
      {embed ? (
        <EmbedBridge parentOrigin={parentOrigin} allowed={parent.allowed} dismissOnEscape />
      ) : null}
      <ErrorNote message={error} />
      <SuccessNote message={notice} />
      {embed && platform && platform.id !== "password" ? (
        <div>
          {invalidLink ? (
            <ErrorNote message="This sign-in link is not valid." />
          ) : (
            <button type="button" disabled={!ready} className="ih-primary" onClick={openConsent}>
              Continue with {platform.label}
            </button>
          )}
        </div>
      ) : embed ? (
        <>
          {password ? (
            <PasswordLogin
              returnTo={returnTo}
              embed={embed}
              parentOrigin={parentOrigin}
              parentAllowed={parent.allowed}
            />
          ) : (
            <p className="text-sm text-muted">Email sign-in is not available on this hub yet.</p>
          )}
          <AuthPrivacyNote />
        </>
      ) : (
        <SignInChoices methods={methods} returnTo={returnTo} />
      )}
    </AuthSurface>
  );
}
