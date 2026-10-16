import { useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { fetchDeveloperApps, fetchSession } from "@/lib/api";
import { Page } from "@/components/shell";
import { AppForm, SecretNotice } from "@/components/app-form";

export const Route = createFileRoute("/apps/")({
  head: () => ({ meta: [{ title: "Your apps · Identity Hub" }] }),
  beforeLoad: async () => {
    const session = await fetchSession();
    if (!session.user) throw redirect({ to: "/login", search: { return_to: "/apps" } });
  },
  loader: () => fetchDeveloperApps(),
  component: Apps,
});

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function Apps() {
  const apps = Route.useLoaderData();
  const navigate = useNavigate();
  const [created, setCreated] = useState<{
    appId: string;
    clientId: string;
    clientSecret: string;
  } | null>(null);
  const [creating, setCreating] = useState(apps.length === 0);
  return (
    <Page width="max-w-3xl">
      <h1 className="text-4xl font-semibold tracking-tight">Your apps</h1>
      <p className="mt-3 text-muted">
        Register a product, pick how its users can sign in, and copy the widget onto your site.
      </p>
      <p className="mt-2 text-sm text-muted">{apps.length} of 25</p>
      <div className="mt-8 grid gap-3">
        {created ? (
          <SecretNotice
            clientId={created.clientId}
            secret={created.clientSecret}
            onDone={() => navigate({ to: "/apps/$appId", params: { appId: created.appId } })}
          />
        ) : null}
        {apps.map((app) => (
          <Link
            key={app.id}
            to="/apps/$appId"
            params={{ appId: app.id }}
            className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-fg no-underline hover:bg-bg-alt"
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold">{app.name}</span>
              <span className="block truncate text-sm text-muted">
                {[
                  app.methods.map((method) => method.label).join(", ") || "No sign-in methods",
                  hostOf(app.homepageUrl),
                  new Date(app.createdAt).toLocaleString(),
                  `${app.memberCount} ${app.memberCount === 1 ? "member" : "members"}`,
                ].join(" · ")}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
          </Link>
        ))}
        {apps.length >= 25 ? (
          <p className="text-sm text-muted">This account already owns the maximum of 25 apps.</p>
        ) : creating ? (
          <AppForm
            onSaved={(result) => {
              setCreating(false);
              if (result) setCreated(result);
            }}
          />
        ) : (
          <button
            type="button"
            className="min-h-11 justify-self-start rounded-full bg-bg-alt px-4 text-sm font-semibold"
            onClick={() => setCreating(true)}
          >
            Register an app
          </button>
        )}
      </div>
    </Page>
  );
}
