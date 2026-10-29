import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { approveConsent, denyConsent, fetchConsent } from "@/lib/api";
import { platformInfo, platformLabel, SCOPES } from "@/lib/platforms";
import { authorizePath, authorizeSearch, type AuthorizeSearch } from "@/lib/authorize-search";
import { PlatformIcon } from "@/components/marks";
import { CheckCircle2, ShieldCheck, UserRound } from "lucide-react";
import { AuthSurface } from "@/components/auth-surface";
import { ErrorNote } from "@/components/shell";
import { useSession } from "@/lib/session";
import { PlatformButtons } from "@/components/platform-buttons";
import { SignInChoices } from "@/components/auth-forms";
import { useHydrated } from "@/lib/use-hydrated";

type Search = AuthorizeSearch;

// The page an app (or its widget) sends people to:
// /authorize?client_id=...&redirect_uri=...&state=...&scope=profile publish[&method=twitter|password][&relay=<id>]
export const Route = createFileRoute("/authorize")({
  head: () => ({ meta: [{ title: "Sign in · Identity Hub" }] }),
  validateSearch: (search: Record<string, unknown>): Search => authorizeSearch(search),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const consent = await fetchConsent({
      data: {
        clientId: deps.client_id,
        redirectUri: deps.redirect_uri,
        state: deps.state,
        scope: deps.scope,
      },
    });
    // The widget already chose a platform: go straight to it instead of asking again.
    const platform =
      consent.ok && !consent.view && deps.method && deps.method !== "password"
        ? consent.app.methods.find((m) => m.id === deps.method)
        : undefined;
    if (platform) {
      throw redirect({
        href: `/api/auth/start?${new URLSearchParams({ platform: platform.id, intent: "login", return_to: authorizePath(deps) })}`,
      });
    }
    return consent;
  },
  component: Authorize,
});

function Authorize() {
  const consent = Route.useLoaderData();
  const search = Route.useSearch();
  const { user } = useSession();
  const request = {
    clientId: search.client_id,
    redirectUri: search.redirect_uri,
    state: search.state,
    scope: search.scope,
    relay: search.relay,
  };
  // Opened as a popup by the widget: platform sign-in happens inside this
  // same window, and the end result goes back to the widget, not to a redirect.
  const inPopup = Boolean(search.relay);
  const [done, setDone] = useState(false);
  const here = authorizePath(search);
  const view = consent.ok ? consent.view : null;
  const [selected, setSelected] = useState<string[]>(() => {
    const grantable = view?.accounts.filter((account) => account.grantable.length > 0) ?? [];
    const previous = grantable.filter((account) => account.granted);
    return (previous.length > 0 ? previous : grantable).map((account) => account.id);
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = useHydrated();

  if (!consent.ok) {
    return (
      <AuthSurface title="This sign-in link is not valid">
        <ErrorNote message={consent.error} />
        <p className="mt-4 text-muted">
          Go back to the app and try again. If it keeps happening, contact the app's developer.
        </p>
      </AuthSurface>
    );
  }

  const methods = consent.app.methods;
  const platforms = methods.filter(
    (method) => method.id !== "password" && !platformInfo(method.id)?.identityOnly,
  );

  const finish = async (
    work: () => Promise<
      { ok: true; redirect: string; relayed: boolean } | { ok: false; error: string }
    >,
  ) => {
    setBusy(true);
    setError(null);
    try {
      const result = await work();
      if (!result.ok) setError(result.error);
      else if (result.relayed) {
        window.opener?.postMessage(
          { source: "identity-hub", v: 1, type: "done" },
          window.location.origin,
        );
        setDone(true);
        window.close();
      } else window.location.assign(result.redirect);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthSurface
        title="All done"
        appName={consent.app.name}
        appearance={consent.app.appearance}
        description="Your choice has been saved."
      >
        <CheckCircle2 className="ih-success" aria-hidden="true" />
        <p className="mt-3 text-muted">
          You can close this window and return to {consent.app.name}.
        </p>
      </AuthSurface>
    );
  }

  return (
    <AuthSurface
      appName={consent.app.name}
      appearance={consent.app.appearance}
      title={`Sign in to ${consent.app.name}`}
      description={
        view
          ? "You're in control. Review what this app may access."
          : "Sign in your way. We'll take it from here."
      }
    >
      {!view ? (
        <SignInChoices
          methods={methods}
          returnTo={here}
          popup={!inPopup}
          emailFirst={search.method === "password"}
        />
      ) : (
        <>
          <div className="ih-identity">
            <span className="ih-avatar" aria-hidden="true">
              {user?.displayName
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => Array.from(part)[0])
                .join("")
                .toUpperCase()}
            </span>
            <div>
              <strong>{user?.displayName}</strong>
              <small>Signed in with IdentityHub</small>
            </div>
            <a
              href={`/login?return_to=${encodeURIComponent(here)}`}
              className="ih-text-link"
              onClick={async (event) => {
                event.preventDefault();
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.assign(here);
              }}
            >
              Not you?
            </a>
          </div>
          <p className="mb-4 break-all text-xs text-muted">
            Application: {consent.app.homepageUrl}
          </p>
          <ul>
            <li className="ih-permission">
              <UserRound aria-hidden="true" />
              <div>
                <strong>Basic profile</strong>
                <p>Your name, picture and email address</p>
              </div>
              <span className="ih-required">Required</span>
            </li>
            {view.scopes.map((scope) => (
              <li key={scope} className="ih-permission">
                <ShieldCheck aria-hidden="true" />
                <div>
                  <strong>
                    {scope === "publish" ? "Publishing access" : "Connected account profiles"}
                  </strong>
                  <p>{SCOPES[scope]} · Only for accounts you select below</p>
                </div>
              </li>
            ))}
          </ul>
          {view.accounts.length > 0 ? (
            <fieldset className="mt-6">
              <legend className="text-sm font-semibold">Accounts {consent.app.name} may use</legend>
              <div className="mt-2 grid gap-2">
                {view.accounts.map((account) => {
                  const disabled = account.grantable.length === 0;
                  return (
                    <label
                      key={account.id}
                      className={`ih-account ${disabled ? "opacity-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        className="size-4"
                        disabled={disabled}
                        checked={selected.includes(account.id)}
                        onChange={(event) =>
                          setSelected((current) =>
                            event.target.checked
                              ? [...current, account.id]
                              : current.filter((id) => id !== account.id),
                          )
                        }
                      />
                      <PlatformIcon id={account.provider} className="size-5 shrink-0" />
                      <span className="min-w-0">
                        <strong className="truncate">{account.displayName}</strong>
                        <small>
                          {platformLabel(account.provider)} · {account.handle}
                          {disabled
                            ? " · cannot grant the requested access"
                            : ` · ${account.grantable.join(", ")}`}
                        </small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <p className="mt-6 text-sm text-muted">
              {consent.app.name} will only learn who you are.
              {platforms.length > 0 ? " Connect an account below to let it use one." : ""}
            </p>
          )}
          {platforms.length > 0 ? (
            <details className="mt-4">
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">
                Connect another account
              </summary>
              <div className="mt-2">
                <PlatformButtons
                  platforms={platforms}
                  intent="connect"
                  returnTo={here}
                  verb="Connect"
                  popup={!inPopup}
                />
              </div>
            </details>
          ) : null}
          <ErrorNote message={error} />
          <p className="mt-4 text-xs text-muted">
            Only selected accounts are shared. You can remove this app's access later in your
            workspace.
          </p>
          <div className="ih-consent-actions">
            <button
              type="button"
              disabled={busy || !ready}
              className="ih-primary ih-accent"
              onClick={() =>
                finish(() => approveConsent({ data: { ...request, accountIds: selected } }))
              }
            >
              {busy ? "Saving…" : "Allow"}
            </button>
            <button
              type="button"
              disabled={busy || !ready}
              className="ih-text-link"
              onClick={() => finish(() => denyConsent({ data: request }))}
            >
              Deny
            </button>
          </div>
        </>
      )}
    </AuthSurface>
  );
}
