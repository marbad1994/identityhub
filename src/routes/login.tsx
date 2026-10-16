import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ErrorNote, Page, SuccessNote } from "@/components/shell";
import { EmbedBridge, postEmbed, reportEmbed } from "@/components/embed-bridge";
import { useSession } from "@/lib/session";
import { PlatformButtons } from "@/components/platform-buttons";
import { Divider, PasswordLogin, primaryButton } from "@/components/auth-forms";
import { fetchEmbedParent } from "@/lib/api";
import { credentialFlags } from "@/lib/authorize-search";
import { openPopup } from "@/lib/popup";

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
    deps.embed === 1
      ? fetchEmbedParent({ data: { returnTo: deps.returnTo, parentOrigin: deps.parentOrigin } })
      : Promise.resolve({ allowed: false, appName: null as string | null }),
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

  if (embedWait === 1) {
    return (
      <Page width="max-w-lg">
        <h1 className="text-3xl font-semibold tracking-tight">Finishing sign-in…</h1>
      </Page>
    );
  }

  const query = returnTo.indexOf("?");
  const methodId =
    query === -1
      ? undefined
      : (new URLSearchParams(returnTo.slice(query + 1)).get("method") ?? undefined);
  const platform = methods.find((method) => method.id === methodId);
  const platforms = methods.filter((method) => method.id !== "password");
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
      <Page embed>
        <EmbedBridge parentOrigin={parentOrigin} allowed={parent.allowed} dismissOnEscape />
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-3 text-muted">
          Continue to finish signing in to {parent.appName ?? "the app"}.
        </p>
        <button type="button" className={`${primaryButton} mt-8`} onClick={openConsent}>
          Continue
        </button>
        {invalidLink ? <ErrorNote message="This sign-in link is not valid." /> : null}
      </Page>
    );
  }

  if (user && !error) return <Navigate to="/workspace" />;

  return (
    <Page width="max-w-lg" embed={embed}>
      {embed ? (
        <EmbedBridge parentOrigin={parentOrigin} allowed={parent.allowed} dismissOnEscape />
      ) : null}
      <h1 className="text-4xl font-semibold tracking-tight">
        {embed && parent.appName ? `Sign in to ${parent.appName}` : "Sign in"}
      </h1>
      {embed ? null : (
        <p className="mt-3 text-muted">Use a platform you post on, or your email and password.</p>
      )}
      <ErrorNote message={error} />
      <SuccessNote message={notice} />
      {embed && platform && platform.id !== "password" ? (
        <div className="mt-8">
          {invalidLink ? (
            <ErrorNote message="This sign-in link is not valid." />
          ) : (
            <button type="button" className={primaryButton} onClick={openConsent}>
              Continue with {platform.label}
            </button>
          )}
        </div>
      ) : (
        <>
          {methods.length === 0 ? (
            <p className="mt-8 text-sm text-muted">
              No sign-in method is configured on this hub yet.
            </p>
          ) : null}
          {embed ? null : (
            <div className="mt-8">
              <PlatformButtons
                platforms={platforms}
                intent="login"
                returnTo={returnTo}
                verb="Continue with"
              />
            </div>
          )}
          {password ? (
            <>
              {!embed && platforms.length > 0 ? (
                <Divider label="or with email" />
              ) : (
                <div className="mt-8" />
              )}
              <PasswordLogin
                returnTo={returnTo}
                embed={embed}
                parentOrigin={parentOrigin}
                parentAllowed={parent.allowed}
              />
            </>
          ) : null}
        </>
      )}
    </Page>
  );
}
