import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { approveConsent, denyConsent, fetchConsent } from "@/lib/api";
import { platformLabel, SCOPES } from "@/lib/platforms";
import { authorizePath, authorizeSearch, type AuthorizeSearch } from "@/lib/authorize-search";
import { PlatformIcon } from "@/components/marks";
import { ErrorNote, Page } from "@/components/shell";
import { useSession } from "@/lib/session";
import { PlatformButtons } from "@/components/platform-buttons";
import { Divider, PasswordLogin } from "@/components/auth-forms";

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
  const [showAll, setShowAll] = useState(search.method !== "password");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!consent.ok) {
    return (
      <Page width="max-w-lg">
        <h1 className="text-3xl font-semibold tracking-tight">This sign-in link is not valid</h1>
        <ErrorNote message={consent.error} />
        <p className="mt-4 text-muted">
          Go back to the app and try again. If it keeps happening, contact the app's developer.
        </p>
      </Page>
    );
  }

  const methods = consent.app.methods;
  const platforms = methods.filter((method) => method.id !== "password");
  const password = methods.some((method) => method.id === "password");

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
      <Page width="max-w-lg">
        <h1 className="text-3xl font-semibold tracking-tight">All done</h1>
        <p className="mt-3 text-muted">
          You can close this window and return to {consent.app.name}.
        </p>
      </Page>
    );
  }

  return (
    <Page width="max-w-lg">
      <p className="text-sm font-semibold text-muted">Identity Hub</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in to {consent.app.name}</h1>
      <p className="mt-2 text-sm text-muted">{consent.app.homepageUrl}</p>

      {!view ? (
        <div className="mt-8">
          {showAll && platforms.length > 0 ? (
            <PlatformButtons
              platforms={platforms}
              intent="login"
              returnTo={here}
              verb="Continue with"
              popup={!inPopup}
            />
          ) : null}
          {password ? (
            <>
              {showAll && platforms.length > 0 ? <Divider label="or with email" /> : null}
              <PasswordLogin returnTo={here} />
            </>
          ) : null}
          {!showAll ? (
            <button
              type="button"
              className="mt-4 min-h-11 text-sm font-medium text-link"
              onClick={() => setShowAll(true)}
            >
              Other ways to sign in
            </button>
          ) : null}
          {methods.length === 0 ? (
            <p className="text-muted">{consent.app.name} has no sign-in method turned on.</p>
          ) : null}
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted">
            Signed in as <span className="font-medium text-fg">{user?.displayName}</span>.{" "}
            <a
              href={`/login?return_to=${encodeURIComponent(here)}`}
              className="text-link no-underline hover:underline"
              onClick={async (event) => {
                event.preventDefault();
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.assign(here);
              }}
            >
              Not you?
            </a>
          </p>
          <ul className="mt-4 grid gap-1 text-sm">
            <li>
              <span className="font-semibold">Identity</span>{" "}
              <span className="text-muted">Your name, picture and email address</span>
            </li>
            {view.scopes.map((scope) => (
              <li key={scope}>
                <span className="font-semibold capitalize">{scope}</span>{" "}
                <span className="text-muted">{SCOPES[scope]}</span>
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
                      className={`flex min-h-11 items-center gap-3 rounded-2xl border border-line px-4 py-2 ${disabled ? "opacity-50" : "cursor-pointer"}`}
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
                        <span className="block truncate font-medium">{account.displayName}</span>
                        <span className="block truncate text-sm text-muted">
                          {platformLabel(account.provider)} · {account.handle}
                          {disabled
                            ? " · cannot grant the requested access"
                            : ` · ${account.grantable.join(", ")}`}
                        </span>
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
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy}
              className="min-h-11 rounded-full bg-bg-alt px-4 text-sm font-semibold disabled:opacity-50"
              onClick={() => finish(() => denyConsent({ data: request }))}
            >
              Deny
            </button>
            <button
              type="button"
              disabled={busy}
              className="min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink disabled:opacity-50"
              onClick={() =>
                finish(() => approveConsent({ data: { ...request, accountIds: selected } }))
              }
            >
              Allow
            </button>
          </div>
        </>
      )}
    </Page>
  );
}
