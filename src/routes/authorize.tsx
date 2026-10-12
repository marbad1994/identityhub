import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { approveConsent, denyConsent, fetchConsent } from "@/lib/api";
import { platformLabel, SCOPES } from "@/lib/platforms";
import { PlatformIcon } from "@/components/marks";
import { ErrorNote, Page, useSession } from "@/components/shell";
import { PlatformButtons } from "@/components/platform-buttons";

type Search = { client_id: string; redirect_uri: string; state?: string; scope?: string };

const text = (value: unknown) => (typeof value === "string" ? value : undefined);

// The page an app sends people to: /authorize?client_id=...&redirect_uri=...&state=...&scope=profile publish
export const Route = createFileRoute("/authorize")({
  head: () => ({ meta: [{ title: "Authorize · Identity Hub" }] }),
  validateSearch: (search: Record<string, unknown>): Search => ({
    client_id: text(search.client_id) ?? "",
    redirect_uri: text(search.redirect_uri) ?? "",
    state: text(search.state),
    scope: text(search.scope),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    fetchConsent({ data: { clientId: deps.client_id, redirectUri: deps.redirect_uri, state: deps.state, scope: deps.scope } }),
  component: Authorize,
});

function Authorize() {
  const consent = Route.useLoaderData();
  const search = Route.useSearch();
  const { platforms } = useSession();
  const request = { clientId: search.client_id, redirectUri: search.redirect_uri, state: search.state, scope: search.scope };
  const here = `/authorize?${new URLSearchParams(Object.entries(search).filter((entry): entry is [string, string] => Boolean(entry[1])))}`;
  const view = consent.ok ? consent.view : null;
  const [selected, setSelected] = useState<string[]>(() => {
    const grantable = view?.accounts.filter((account) => account.grantable.length > 0) ?? [];
    const previous = grantable.filter((account) => account.granted);
    return (previous.length > 0 ? previous : grantable).map((account) => account.id);
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!consent.ok) {
    return (
      <Page width="max-w-lg">
        <h1 className="text-3xl font-semibold tracking-tight">This sign-in link is not valid</h1>
        <ErrorNote message={consent.error} />
        <p className="mt-4 text-muted">Go back to the app and try again. If it keeps happening, contact the app's developer.</p>
      </Page>
    );
  }

  const finish = async (work: () => Promise<{ ok: true; redirect: string } | { ok: false; error: string }>) => {
    setBusy(true);
    setError(null);
    try {
      const result = await work();
      if (result.ok) window.location.assign(result.redirect);
      else setError(result.error);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page width="max-w-lg">
      <p className="text-sm font-semibold text-muted">Identity Hub</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{consent.app.name} wants to use your accounts</h1>
      <p className="mt-2 text-sm text-muted">{consent.app.homepageUrl}</p>

      {!view ? (
        <div className="mt-8">
          <p className="mb-4 text-muted">Sign in to choose which accounts {consent.app.name} may use.</p>
          <PlatformButtons platforms={platforms} intent="login" returnTo={here} verb="Continue with" />
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-1 text-sm">
            {view.scopes.map((scope) => (
              <li key={scope}>
                <span className="font-semibold capitalize">{scope}</span> <span className="text-muted">{SCOPES[scope]}</span>
              </li>
            ))}
          </ul>
          <fieldset className="mt-6">
            <legend className="text-sm font-semibold">Accounts {consent.app.name} may use</legend>
            {view.accounts.length === 0 ? <p className="mt-2 text-sm text-muted">Connect an account below first.</p> : null}
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
                        setSelected((current) => (event.target.checked ? [...current, account.id] : current.filter((id) => id !== account.id)))
                      }
                    />
                    <PlatformIcon id={account.provider} className="size-5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{account.displayName}</span>
                      <span className="block truncate text-sm text-muted">
                        {platformLabel(account.provider)} · {account.handle}
                        {disabled ? " · cannot grant the requested access" : ` · ${account.grantable.join(", ")}`}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <details className="mt-4">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Connect another account</summary>
            <div className="mt-2">
              <PlatformButtons platforms={platforms} intent="connect" returnTo={here} verb="Connect" />
            </div>
          </details>
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
              disabled={busy || selected.length === 0}
              className="min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink disabled:opacity-50"
              onClick={() => finish(() => approveConsent({ data: { ...request, accountIds: selected } }))}
            >
              Allow
            </button>
          </div>
        </>
      )}
    </Page>
  );
}
