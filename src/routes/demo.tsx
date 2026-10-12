import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { initialWidget, PROVIDERS, type ProviderId, type WidgetConfig } from "@/lib/hub";
import { fetchHub } from "@/lib/broker/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SiteFooter, SiteHeader } from "@/components/shell";
import { WidgetFrame } from "@/components/widget-frame";
import type { WidgetSelection } from "@/types/identity-hub";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [{ title: "Widget demo · Identity Hub" }],
  }),
  component: DemoPage,
});

function DemoPage() {
  const { user, isPending } = useCurrentUserState();
  const [config, setConfig] = useState<WidgetConfig>(initialWidget);
  const [events, setEvents] = useState<WidgetSelection[]>([]);

  useEffect(() => {
    if (!user) return;
    let dead = false;
    fetchHub()
      .then((hub) => {
        if (!dead) setConfig(hub.widget);
      })
      .catch(() => undefined);
    return () => {
      dead = true;
    };
  }, [user]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div>
          <p className="text-sm font-semibold text-muted">Embeddable widget</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Try a sandbox selection.</h1>
          <p className="mt-3 text-muted">
            {user
              ? "This picker uses the widget saved in your workspace. Continuing does not authenticate anyone."
              : "Sandbox mode returns a selection and no token. Sign in to preview the widget saved in your workspace."}
          </p>
          <div className="mt-6">
            {isPending ? <div className="h-64 animate-pulse rounded-card bg-bg-alt" /> : <WidgetFrame config={config} onSelect={(detail) => setEvents((current) => [detail, ...current].slice(0, 8))} />}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Events on this page</h2>
          {events.length === 0 ? (
            <p className="mt-3 text-muted">Nothing yet. Choose platforms and continue.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {events.map((event, index) => (
                <li key={`${event.appName}-${index}`} className="rounded-card border border-line bg-bg p-4 shadow-card">
                  <p className="font-semibold">{event.appName}</p>
                  <p className="text-sm text-muted">
                    authenticated: false ·{" "}
                    {event.platforms
                      .map((id) => PROVIDERS.find((p) => p.id === (id as ProviderId))?.name ?? id)
                      .join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}