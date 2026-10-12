import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { approveConnect, fetchConnectionsForConsent, lookupProduct } from "@/lib/broker/api";
import { PROVIDERS, SCOPE_LABEL, type ScopeId } from "@/lib/hub";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SiteFooter, SiteHeader } from "@/components/shell";

export const Route = createFileRoute("/connect")({
  head: () => ({ meta: [{ title: "Connect · Identity Hub" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    client_id: typeof search.client_id === "string" && search.client_id ? search.client_id : undefined,
    redirect_uri: typeof search.redirect_uri === "string" && search.redirect_uri ? search.redirect_uri : undefined,
  }),
  component: Connect,
});

function Connect() {
  const { user, isPending } = useCurrentUserState();
  const { client_id: clientId = "", redirect_uri: redirectUri = "" } = Route.useSearch();
  const returnTo = `/connect?${new URLSearchParams({
    ...(clientId ? { client_id: clientId } : {}),
    ...(redirectUri ? { redirect_uri: redirectUri } : {}),
  }).toString()}`;
  const [product, setProduct] = useState<{ name: string; origin: string } | null>(null);
  const [missing, setMissing] = useState(false);
  const [connections, setConnections] = useState<Awaited<ReturnType<typeof fetchConnectionsForConsent>>["connections"]>([]);
  const [connectionId, setConnectionId] = useState("");
  const [scopes, setScopes] = useState<ScopeId[]>(["profile"]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    lookupProduct({ data: { clientId } })
      .then((found) => {
        if (!found) setMissing(true);
        else setProduct(found);
      })
      .catch(() => setMissing(true));
  }, [clientId]);

  useEffect(() => {
    if (!user) return;
    fetchConnectionsForConsent()
      .then((payload) => {
        setConnections(payload.connections);
        const first = payload.connections[0];
        if (first) setConnectionId(first.id);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load connections."));
  }, [user]);

  const selected = connections.find((item) => item.id === connectionId);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-5 py-16">
        <p className="text-sm font-semibold text-muted">Consent</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{product ? product.name : "Connect an account"}</h1>
        <p className="mt-3 text-muted">
          {product ? `${product.name} is asking for access. The platform token stays on Identity Hub.` : missing ? "That client id is not registered." : "Looking up the app…"}
        </p>
        {isPending ? <p className="mt-6 text-muted">Checking session…</p> : null}
        {!isPending && !user ? (
          <div className="mt-6 grid gap-2">
            {GROK_PROVIDERS.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                className="min-h-11 rounded-full bg-ink text-sm font-semibold text-on-ink"
                onClick={() => signIn(provider.providerId, { callbackURL: returnTo })}
              >
                Continue with {provider.label}
              </button>
            ))}
          </div>
        ) : null}
        {user && selected ? (
          <form
            className="mt-6 rounded-card border border-line p-5 shadow-card"
            onSubmit={async (event) => {
              event.preventDefault();
              const result = await approveConnect({
                data: { clientId, connectionId, scopes, redirectUri: redirectUri || product?.origin || "" },
              });
              if (!result.ok) setError(result.error);
              else window.location.assign(result.redirect);
            }}
          >
            <label className="block text-sm font-medium">
              Account
              <select
                className="mt-1 w-full min-h-11 rounded-xl border border-line bg-bg px-3"
                value={connectionId}
                onChange={(event) => {
                  setConnectionId(event.target.value);
                  const next = connections.find((item) => item.id === event.target.value);
                  setScopes(next?.scopes.slice(0, 1) ?? ["profile"]);
                }}
              >
                {connections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {PROVIDERS.find((provider) => provider.id === item.provider)?.name} · {item.handle}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              {selected.scopes.map((scope) => (
                <button
                  key={scope}
                  type="button"
                  aria-pressed={scopes.includes(scope)}
                  className={`min-h-11 rounded-full px-3 text-sm font-medium ${scopes.includes(scope) ? "bg-ink text-on-ink" : "bg-bg-alt"}`}
                  onClick={() =>
                    setScopes((current) => (current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]))
                  }
                >
                  {SCOPE_LABEL[scope]}
                </button>
              ))}
            </div>
            <button type="submit" className="mt-5 min-h-11 w-full rounded-full bg-ink text-sm font-semibold text-on-ink">
              Allow and return
            </button>
            {error ? <p role="alert" className="mt-3 text-sm text-danger">{error}</p> : null}
          </form>
        ) : null}
        {user && connections.length === 0 ? <p className="mt-6 text-muted">Connect an account in the workspace first.</p> : null}
      </main>
      <SiteFooter />
    </>
  );
}
