import { useEffect, useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { format } from "date-fns";
import { PLANNED, PROVIDERS, SCOPE_LABEL, type ProviderId, type ScopeId } from "@/lib/hub";
import {
  beginLiveConnect,
  connectSandboxAccount,
  disconnectConnection,
  fetchHub,
  hideProductSecret,
  loadSamples,
  registerProduct,
  removeProduct,
  resetHub,
  saveGrant,
  saveWidget,
} from "@/lib/broker/api";
import type { ConnectionView, HubResult, HubView } from "@/lib/broker/types";
import { PlatformIcon } from "./marks";
import { WidgetFrame } from "./widget-frame";

type Tab = "connections" | "apps" | "permissions" | "activity" | "widget" | "setup";
type Commit = (result: Promise<HubResult>) => Promise<HubResult>;

const tabs: { id: Tab; label: string }[] = [
  { id: "connections", label: "Connections" },
  { id: "apps", label: "Apps" },
  { id: "permissions", label: "Permissions" },
  { id: "activity", label: "Activity" },
  { id: "widget", label: "Widget" },
  { id: "setup", label: "Keys" },
];

function stamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return format(date, "MMM d, yyyy · HH:mm");
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  );
}

function providerName(id: ProviderId) {
  return PROVIDERS.find((p) => p.id === id)?.name ?? id;
}

export function WorkspaceView() {
  const [hub, setHub] = useState<HubView | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("connections");
  const search = useRouterState({ select: (state) => state.location.searchStr });
  const notice = new URLSearchParams(search).get("error") || new URLSearchParams(search).get("connected");
  const billingNotice = new URLSearchParams(search).get("billing");

  useEffect(() => {
    let active = true;
    fetchHub()
      .then((next) => {
        if (active) setHub(next);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Could not load the workspace.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function commit(task: Promise<HubResult>): Promise<HubResult> {
    try {
      const result = await task;
      if (result.hub) setHub(result.hub);
      if (result.ok && result.authorizeUrl) window.location.assign(result.authorizeUrl);
      return result;
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Request failed." };
    }
  }

  if (!ready) {
    return <p className="mx-auto max-w-6xl px-5 py-16 text-muted">Loading workspace…</p>;
  }
  if (!hub) {
    return (
      <p role="alert" className="mx-auto max-w-6xl px-5 py-16 text-danger">
        {loadError ?? "Could not load the workspace."}
      </p>
    );
  }

  return (
    <div>
      <section className="border-b border-line bg-bg-alt">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <p className="text-sm font-semibold text-muted">
            {hub.billing.plan === "sandbox" ? "Sandbox plan" : `${hub.billing.plan} plan`} · {hub.billing.liveProfiles}/
            {hub.billing.profileLimit} live profiles
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
            Connections, apps, and grants
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Saved to your account. Sandbox profiles never leave this hub. Live profiles start only after the matching
            platform keys and encryption secret are set.
          </p>
          {notice ? (
            <p className="mt-4 text-sm text-fg" role="status">
              {new URLSearchParams(search).get("error") ? notice : `Connected ${notice}.`}
            </p>
          ) : null}
          {billingNotice === "success" ? <p className="mt-4 text-sm text-ok">Checkout returned. The plan updates when Stripe confirms the webhook.</p> : null}
          <dl className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Connections" value={hub.connections.length} />
            <Stat label="Apps" value={hub.products.length} />
            <Stat label="Grants" value={hub.grants.length} />
            <Stat label="Activity" value={hub.events.length} />
          </dl>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-5 py-8">
        <div role="tablist" aria-label="Workspace" className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${
                tab === item.id ? "bg-ink text-on-ink" : "bg-bg-alt text-fg"
              }`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="pt-6" role="tabpanel">
          {tab === "connections" ? <Connections hub={hub} commit={commit} /> : null}
          {tab === "apps" ? <Apps hub={hub} commit={commit} /> : null}
          {tab === "permissions" ? <Permissions hub={hub} commit={commit} /> : null}
          {tab === "activity" ? <Activity hub={hub} commit={commit} onReset={(next) => setHub(next)} /> : null}
          {tab === "widget" ? <WidgetPanel hub={hub} commit={commit} /> : null}
          {tab === "setup" ? <Setup hub={hub} /> : null}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-line bg-bg px-4 py-4 shadow-card">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tracking-tight">{value}</dd>
    </div>
  );
}

function Connections({
  hub,
  commit,
}: {
  hub: HubView;
  commit: Commit;
}) {
  const [provider, setProvider] = useState<ProviderId>("x");
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [scopes, setScopes] = useState<ScopeId[]>(["profile"]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const def = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];

  function chooseProvider(id: ProviderId) {
    const next = PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
    setProvider(id);
    setScopes((current) => {
      const kept = current.filter((scope) => next.scopes.includes(scope));
      return kept.length > 0 ? kept : [next.scopes[0]];
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
      <form
        className="rounded-card border border-line bg-bg p-5 shadow-card"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await commit(
            connectSandboxAccount({ data: { provider, handle, displayName, scopes } }),
          );
          setError(result.ok ? null : result.error);
          if (result.ok) {
            setHandle("");
            setDisplayName("");
          }
        }}
      >
        <h2 className="text-xl font-semibold tracking-tight">Connect a sandbox account</h2>
        <p className="mt-1 text-sm text-muted">No password, no redirect, no token.</p>
        <fieldset className="mt-4">
          <legend className="text-sm font-medium">Platform</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {PROVIDERS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={provider === item.id}
                onClick={() => chooseProvider(item.id)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium ${
                  provider === item.id ? "bg-ink text-on-ink" : "bg-bg-alt text-fg"
                }`}
              >
                <PlatformIcon id={item.id} className="size-4" />
                {item.name}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="mt-4 block text-sm font-medium">
          Display name
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="mt-1 w-full min-h-11 rounded-xl border border-line bg-bg px-3"
            placeholder="Northwind"
            maxLength={60}
            required
          />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Handle
          <input
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            className="mt-1 w-full min-h-11 rounded-xl border border-line bg-bg px-3"
            placeholder="@studio"
            maxLength={32}
            required
          />
        </label>
        <fieldset className="mt-4">
          <legend className="text-sm font-medium">Scopes on {def.name}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {def.scopes.map((scope) => {
              const on = scopes.includes(scope);
              return (
                <button
                  key={scope}
                  type="button"
                  aria-pressed={on}
                  className={`min-h-11 rounded-full px-3 text-sm font-medium ${on ? "bg-ink text-on-ink" : "bg-bg-alt text-fg"}`}
                  onClick={() =>
                    setScopes((current) =>
                      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
                    )
                  }
                >
                  {SCOPE_LABEL[scope]}
                </button>
              );
            })}
          </div>
        </fieldset>
        <button type="submit" className="mt-5 min-h-11 w-full rounded-full bg-ink px-4 text-sm font-semibold text-on-ink">
          Save sandbox profile
        </button>
        <button
          type="button"
          className="mt-2 min-h-11 w-full rounded-full bg-bg-alt px-4 text-sm font-semibold"
          onClick={async () => {
            const result = await commit(beginLiveConnect({ data: { provider, scopes } }));
            setError(result.ok ? null : result.error);
          }}
        >
          Connect {def.name} for real
        </button>
        {hub.readiness.providers[provider].missing.length > 0 ? (
          <p className="mt-3 text-sm text-muted">
            Live connect still needs {hub.readiness.providers[provider].missing.join(", ")}.
          </p>
        ) : (
          <p className="mt-3 text-sm text-ok">Live keys are set for {def.name}. Register this callback with the platform app.</p>
        )}
        <div className="mt-3">
          <FieldError message={error} />
        </div>
        <p className="mt-4 text-sm text-muted">{PLANNED[0].name} is {PLANNED[0].note.toLowerCase()}.</p>
      </form>
      <div className="space-y-3">
        {hub.connections.length === 0 ? (
          <div className="rounded-card border border-dashed border-line bg-bg-alt p-6">
            <h2 className="text-lg font-semibold">No accounts yet</h2>
            <p className="mt-1 text-sm text-muted">
              Connect one yourself, or load the Northwind sample on X, Instagram, and LinkedIn.
            </p>
            <button
              type="button"
              className="mt-4 min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink"
              onClick={async () => setError((await commit(loadSamples())).ok ? null : "Could not load samples.")}
            >
              Load sample accounts
            </button>
          </div>
        ) : (
          hub.connections.map((connection) => (
            <ConnectionCard
              key={connection.id}
              connection={connection}
              confirming={pending === connection.id}
              onAsk={() => setPending(connection.id)}
              onCancel={() => setPending(null)}
              onConfirm={async () => {
                const result = await commit(disconnectConnection({ data: { connectionId: connection.id } }));
                setError(result.ok ? null : result.error);
                setPending(null);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConnectionCard({
  connection,
  confirming,
  onAsk,
  onCancel,
  onConfirm,
}: {
  connection: ConnectionView;
  confirming: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <article className="rounded-card border border-line bg-bg p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-bg-alt">
            <PlatformIcon id={connection.provider} className="size-5" />
          </span>
          <div>
            <h3 className="font-semibold tracking-tight">
              {providerName(connection.provider)} · {connection.handle}
            </h3>
            <p className="text-sm text-muted">
              {connection.displayName} · {stamp(connection.connectedAt)}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${connection.mode === "live" ? "bg-ink text-on-ink" : "bg-ok-soft text-ok"}`}>
          {connection.mode === "live" ? "Live" : "Sandbox"}
        </span>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {connection.scopes.map((scope) => (
          <li key={scope} className="rounded-full bg-bg-alt px-3 py-1 text-sm">
            {SCOPE_LABEL[scope]}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        {confirming ? (
          <>
            <button type="button" className="min-h-11 rounded-full bg-danger px-4 text-sm font-semibold text-on-ink" onClick={onConfirm}>
              Disconnect and drop grants
            </button>
            <button type="button" className="min-h-11 rounded-full bg-bg-alt px-4 text-sm font-semibold" onClick={onCancel}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="min-h-11 rounded-full bg-bg-alt px-4 text-sm font-semibold" onClick={onAsk}>
            Disconnect
          </button>
        )}
      </div>
    </article>
  );
}

function Apps({
  hub,
  commit,
}: {
  hub: HubView;
  commit: Commit;
}) {
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const [secret, setSecret] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
      <form
        className="rounded-card border border-line bg-bg p-5 shadow-card"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await commit(registerProduct({ data: { name, origin, description } }));
          setError(result.ok ? null : result.error);
          if (result.ok) {
            setSecret(result.secret ?? null);
            setName("");
            setOrigin("");
            setDescription("");
          }
        }}
      >
        <h2 className="text-xl font-semibold tracking-tight">Register an app</h2>
        <p className="mt-1 text-sm text-muted">We store an https origin and a hashed client secret. The secret is shown once.</p>
        <label className="mt-4 block text-sm font-medium">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full min-h-11 rounded-xl border border-line bg-bg px-3"
            placeholder="Studio console"
            maxLength={48}
            required
          />
        </label>
        <label className="mt-3 block text-sm font-medium">
          HTTPS origin
          <input
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
            className="mt-1 w-full min-h-11 rounded-xl border border-line bg-bg px-3"
            placeholder="https://studio.example"
            inputMode="url"
            required
          />
        </label>
        <label className="mt-3 block text-sm font-medium">
          What it does
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1 w-full min-h-11 rounded-xl border border-line bg-bg px-3"
            placeholder="Publishes for one tenant"
            maxLength={140}
          />
        </label>
        <button type="submit" className="mt-5 min-h-11 w-full rounded-full bg-ink px-4 text-sm font-semibold text-on-ink">
          Register app
        </button>
        <div className="mt-3">
          <FieldError message={error} />
        </div>
        {secret ? <p className="mt-3 break-all rounded-xl bg-bg-alt p-3 text-sm">Client secret, copy it now: {secret}</p> : null}
        <p className="mt-4 text-sm text-muted">Dark Suite stays unregistered. Keep that infrastructure isolated.</p>
      </form>
      <ul className="space-y-3">
        {hub.products.map((product) => {
          const grants = hub.grants.filter((grant) => grant.productId === product.id).length;
          return (
            <li key={product.id} className="rounded-card border border-line bg-bg p-5 shadow-card">
              <h3 className="font-semibold tracking-tight">{product.name}</h3>
              <p className="text-sm text-link">{product.origin}</p>
              <p className="mt-1 break-all text-sm text-muted">Client ID {product.clientId}</p>
              {product.revealSecret ? (
                <div className="mt-3 rounded-xl bg-bg-alt p-3">
                  <p className="text-sm font-medium">Client secret — copy it, then hide it. It is not shown again.</p>
                  <p className="mt-2 break-all text-sm">{product.revealSecret}</p>
                  <button
                    type="button"
                    className="mt-3 min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink"
                    onClick={async () => {
                      const result = await commit(hideProductSecret({ data: { productId: product.id } }));
                      setError(result.ok ? null : result.error);
                    }}
                  >
                    I’ve saved this secret
                  </button>
                </div>
              ) : null}
              {product.description ? <p className="mt-1 text-sm text-muted">{product.description}</p> : null}
              <p className="mt-2 text-sm text-muted">
                {grants} grant{grants === 1 ? "" : "s"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {pending === product.id ? (
                  <>
                    <button
                      type="button"
                      className="min-h-11 rounded-full bg-danger px-4 text-sm font-semibold text-on-ink"
                      onClick={async () => {
                        const result = await commit(removeProduct({ data: { productId: product.id } }));
                        setError(result.ok ? null : result.error);
                        setPending(null);
                      }}
                    >
                      Remove app and grants
                    </button>
                    <button type="button" className="min-h-11 rounded-full bg-bg-alt px-4 text-sm font-semibold" onClick={() => setPending(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button type="button" className="min-h-11 rounded-full bg-bg-alt px-4 text-sm font-semibold" onClick={() => setPending(product.id)}>
                    Remove
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Permissions({
  hub,
  commit,
}: {
  hub: HubView;
  commit: Commit;
}) {
  const [productId, setProductId] = useState(hub.products[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const product = hub.products.find((item) => item.id === productId) ?? hub.products[0];

  const draftKey = product?.id ?? "";
  const baseline = useMemo(() => {
    const map: Record<string, ScopeId[]> = {};
    if (!product) return map;
    for (const connection of hub.connections) {
      const grant = hub.grants.find((item) => item.productId === product.id && item.connectionId === connection.id);
      map[connection.id] = grant?.scopes ?? [];
    }
    return map;
  }, [hub.connections, hub.grants, product]);
  const [drafts, setDrafts] = useState<Record<string, Record<string, ScopeId[]>>>({});
  const draft = drafts[draftKey] ?? baseline;

  if (!product) {
    return <p className="text-muted">Register an app before granting access.</p>;
  }
  if (hub.connections.length === 0) {
    return <p className="text-muted">Connect a sandbox account before granting access.</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">What each app may use</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        A grant can only include scopes the account already allowed. Empty grants are a revoke.
      </p>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {hub.products.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === product.id}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${
              item.id === product.id ? "bg-ink text-on-ink" : "bg-bg-alt text-fg"
            }`}
            onClick={() => setProductId(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <FieldError message={error} />
      <ul className="mt-4 space-y-3">
        {hub.connections.map((connection) => {
          const selected = draft[connection.id] ?? baseline[connection.id] ?? [];
          return (
            <li key={connection.id} className="rounded-card border border-line bg-bg p-5 shadow-card">
              <h3 className="font-semibold">
                {providerName(connection.provider)} · {connection.handle}
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {connection.scopes.map((scope) => {
                  const on = selected.includes(scope);
                  return (
                    <button
                      key={scope}
                      type="button"
                      aria-pressed={on}
                      className={`min-h-11 rounded-full px-3 text-sm font-medium ${on ? "bg-ink text-on-ink" : "bg-bg-alt text-fg"}`}
                      onClick={() =>
                        setDrafts((current) => {
                          const base = current[draftKey] ?? baseline;
                          const now = base[connection.id] ?? [];
                          const next = now.includes(scope) ? now.filter((item) => item !== scope) : [...now, scope];
                          return { ...current, [draftKey]: { ...base, [connection.id]: next } };
                        })
                      }
                    >
                      {SCOPE_LABEL[scope]}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="mt-4 min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink"
                onClick={async () => {
                  const result = await commit(
                    saveGrant({
                      data: { productId: product.id, connectionId: connection.id, scopes: selected },
                    }),
                  );
                  setError(result.ok ? null : result.error);
                }}
              >
                {selected.length === 0 ? "Revoke grant" : "Save grant"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Activity({
  hub,
  commit,
  onReset,
}: {
  hub: HubView;
  commit: Commit;
  onReset: (hub: HubView) => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink"
          onClick={() => {
            const blob = new Blob(
              [
                JSON.stringify(
                  { note: "Provider tokens and client secrets are not included.", ...hub, readiness: undefined, products: hub.products.map(({ revealSecret: _secret, ...product }) => product) },
                  null,
                  2,
                ),
              ],
              { type: "application/json" },
            );
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "identity-hub.json";
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export JSON
        </button>
        <button
          type="button"
          className="min-h-11 rounded-full bg-bg-alt px-4 text-sm font-semibold"
          onClick={async () => {
            const result = await commit(loadSamples());
            setError(result.ok ? null : result.error);
          }}
        >
          Load sample accounts
        </button>
        {confirmReset ? (
          <>
            <button
              type="button"
              className="min-h-11 rounded-full bg-danger px-4 text-sm font-semibold text-on-ink"
              onClick={async () => {
                onReset(await resetHub());
                setConfirmReset(false);
              }}
            >
              Confirm reset
            </button>
            <button type="button" className="min-h-11 rounded-full bg-bg-alt px-4 text-sm font-semibold" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="min-h-11 rounded-full bg-bg-alt px-4 text-sm font-semibold" onClick={() => setConfirmReset(true)}>
            Reset workspace
          </button>
        )}
      </div>
      <FieldError message={error} />
      {hub.events.length === 0 ? (
        <p className="mt-6 text-muted">Nothing has happened in this workspace yet. The log keeps the latest 200 records.</p>
      ) : (
        <ol className="mt-6 divide-y divide-line rounded-card border border-line bg-bg shadow-card">
          {hub.events.map((event) => (
            <li key={event.id} className="px-5 py-4">
              <p className="font-semibold">{event.action}</p>
              <p className="text-sm text-muted">{event.detail}</p>
              <p className="mt-1 text-xs text-muted">{stamp(event.at)}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function WidgetPanel({
  hub,
  commit,
}: {
  hub: HubView;
  commit: Commit;
}) {
  const [name, setName] = useState(hub.widget.name);
  const [theme, setTheme] = useState(hub.widget.theme);
  const [providers, setProviders] = useState<ProviderId[]>(hub.widget.providers);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const snippet = `<div id="identity-hub"></div>\n<script src="/identity-hub-widget.js"></script>\n<script>\n  IdentityHub.mount("#identity-hub", {\n    appName: ${JSON.stringify(hub.widget.name)},\n    theme: ${JSON.stringify(hub.widget.theme)},\n    providers: ${JSON.stringify(hub.widget.providers)},\n    mode: "sandbox"\n  });\n</script>`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        className="rounded-card border border-line bg-bg p-5 shadow-card"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await commit(saveWidget({ data: { name, theme, providers } }));
          setError(result.ok ? null : result.error);
        }}
      >
        <h2 className="text-xl font-semibold tracking-tight">Widget</h2>
        <p className="mt-1 text-sm text-muted">Shadow DOM, no dependencies, sandbox mode only.</p>
        <label className="mt-4 block text-sm font-medium">
          App name shown to people
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full min-h-11 rounded-xl border border-line bg-bg px-3"
            maxLength={40}
            required
          />
        </label>
        <fieldset className="mt-4">
          <legend className="text-sm font-medium">Theme</legend>
          <div className="mt-2 flex gap-2">
            {(["light", "dark"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={theme === item}
                className={`min-h-11 rounded-full px-4 text-sm font-semibold capitalize ${theme === item ? "bg-ink text-on-ink" : "bg-bg-alt text-fg"}`}
                onClick={() => setTheme(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-4">
          <legend className="text-sm font-medium">Platforms in the picker</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {PROVIDERS.map((item) => {
              const on = providers.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={on}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium ${on ? "bg-ink text-on-ink" : "bg-bg-alt text-fg"}`}
                  onClick={() =>
                    setProviders((current) =>
                      current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id],
                    )
                  }
                >
                  <PlatformIcon id={item.id} className="size-4" />
                  {item.name}
                </button>
              );
            })}
          </div>
        </fieldset>
        <button type="submit" className="mt-5 min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink">
          Save widget
        </button>
        <div className="mt-3">
          <FieldError message={error} />
        </div>
        <pre className="mt-5 overflow-x-auto rounded-card bg-ink p-4 text-sm leading-relaxed text-on-ink">{snippet}</pre>
        <button
          type="button"
          className="mt-3 min-h-11 rounded-full bg-bg-alt px-4 text-sm font-semibold"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(snippet);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Copied" : "Copy embed snippet"}
        </button>
      </form>
      <div>
        <p className="mb-3 text-sm font-medium text-muted">Preview updates as you edit. Save to keep it.</p>
        <WidgetFrame
          config={{
            name: name.trim().length >= 2 ? name.trim() : hub.widget.name,
            theme,
            providers: providers.length > 0 ? providers : hub.widget.providers,
          }}
        />
      </div>
    </div>
  );
}

function Setup({ hub }: { hub: HubView }) {
  const rows = [
    ["TOKEN_ENCRYPTION_KEY", hub.readiness.encryption],
    ["APP_ORIGIN", hub.readiness.appOrigin],
    ["STRIPE_SECRET_KEY", hub.readiness.stripe],
    ["STRIPE_WEBHOOK_SECRET", hub.readiness.webhook],
    ["STRIPE_PRICE_STARTER", hub.readiness.prices.starter],
    ["STRIPE_PRICE_GROWTH", hub.readiness.prices.growth],
    ["STRIPE_PRICE_SCALE", hub.readiness.prices.scale],
  ] as const;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-card border border-line bg-bg p-5 shadow-card">
        <h2 className="text-xl font-semibold tracking-tight">Platform keys</h2>
        <p className="mt-1 text-sm text-muted">
          Set these on the host. Values never reach the browser. Register /api/oauth/callback on APP_ORIGIN with each platform.
        </p>
        <ul className="mt-4 divide-y divide-line">
          {(Object.keys(hub.readiness.providers) as ProviderId[]).map((id) => {
            const item = hub.readiness.providers[id];
            return (
              <li key={id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{providerName(id)}</p>
                  <p className="text-sm text-muted">{item.ready ? "Ready" : item.missing.join(", ")}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.ready ? "bg-ok-soft text-ok" : "bg-bg-alt text-muted"}`}>
                  {item.ready ? "Set" : "Missing"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="rounded-card border border-line bg-bg p-5 shadow-card">
        <h2 className="text-xl font-semibold tracking-tight">Billing and encryption</h2>
        <ul className="mt-4 divide-y divide-line">
          {rows.map(([name, ready]) => (
            <li key={name} className="flex items-center justify-between gap-3 py-3">
              <p className="text-sm font-medium">{name}</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ready ? "bg-ok-soft text-ok" : "bg-bg-alt text-muted"}`}>
                {ready ? "Set" : "Missing"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          Plan {hub.billing.plan}, status {hub.billing.status}. Live cap {hub.billing.profileLimit}. Webhook /api/stripe/webhook. Exchange POST /api/oauth/token. Introspection GET /api/oauth/introspect.
        </p>
      </section>
    </div>
  );
}
