import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, notFound, redirect, useNavigate } from "@tanstack/react-router";
import { Check, Copy, KeyRound, Trash2 } from "lucide-react";
import { deleteApp, fetchDeveloperApp, fetchSession, rotateAppSecret, saveWidget } from "@/lib/api";
import { useAction } from "@/lib/use-action";
import { PlatformIcon } from "@/components/marks";
import { ErrorNote, Page } from "@/components/shell";
import { AppForm, SecretNotice } from "@/components/app-form";
import type { DeveloperAppView } from "@/server/workspace";
import type { MethodView } from "@/server/methods";

export const Route = createFileRoute("/apps/$appId")({
  head: () => ({ meta: [{ title: "App · Identity Hub" }] }),
  beforeLoad: async ({ params }) => {
    const session = await fetchSession();
    if (!session.user)
      throw redirect({ to: "/login", search: { return_to: `/apps/${params.appId}` } });
  },
  loader: async ({ params }) => {
    const result = await fetchDeveloperApp({ data: { appId: params.appId } });
    if (!result.app) throw notFound();
    return { ...result, app: result.app };
  },
  component: AppPage,
});

declare global {
  interface Window {
    IdentityHub?: {
      mount: (element: HTMLElement, options: Record<string, unknown>) => Promise<void>;
    };
  }
}

function AppPage() {
  const { app, available, hubOrigin } = Route.useLoaderData();
  const navigate = useNavigate();
  const { error, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  return (
    <Page width="max-w-5xl">
      <p className="text-sm font-semibold text-muted">App</p>
      <h1 className="text-4xl font-semibold tracking-tight">{app.name}</h1>
      <ErrorNote message={error} />
      <WidgetBuilder key={app.id} app={app} available={available} hubOrigin={hubOrigin} />

      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">Credentials and redirects</h2>
        <div className="mt-4 grid gap-3">
          {secret ? (
            <SecretNotice clientId={app.clientId} secret={secret} onDone={() => setSecret(null)} />
          ) : null}
          {editing ? (
            <AppForm app={app} onSaved={() => setEditing(false)} />
          ) : (
            <div className="rounded-2xl border border-line p-4">
              <dl className="grid gap-2 text-sm">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted">client_id</dt>
                  <dd className="break-all">{app.clientId}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted">Homepage</dt>
                  <dd className="break-all">{app.homepageUrl}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted">Redirect URIs</dt>
                  <dd className="break-all">{app.redirectUris.join(", ")}</dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-1">
                <button
                  type="button"
                  className="min-h-11 rounded-full px-3 text-sm font-medium hover:bg-bg-alt"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium hover:bg-bg-alt"
                  onClick={async () => {
                    if (
                      !confirm(
                        `Rotate ${app.name}'s client secret? The old one stops working immediately.`,
                      )
                    )
                      return;
                    const result = await run(() => rotateAppSecret({ data: { appId: app.id } }));
                    if (result?.ok) setSecret(result.clientSecret);
                  }}
                >
                  <KeyRound className="size-4" aria-hidden="true" />
                  New secret
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-danger hover:bg-danger-soft"
                  onClick={async () => {
                    if (
                      !confirm(
                        `Delete ${app.name}? Everyone's grants and tokens for it are removed.`,
                      )
                    )
                      return;
                    const result = await run(() => deleteApp({ data: { appId: app.id } }));
                    if (result?.ok) await navigate({ to: "/apps" });
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete app
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </Page>
  );
}

/** Load /widget.js once; the preview mounts the same script the snippet uses. */
function useWidgetScript(): boolean {
  const [ready, setReady] = useState(
    () => typeof window !== "undefined" && Boolean(window.IdentityHub),
  );
  useEffect(() => {
    if (window.IdentityHub) return setReady(true);
    const existing = document.querySelector<HTMLScriptElement>("script[data-ihub-preview]");
    const script =
      existing ??
      Object.assign(document.createElement("script"), { src: "/widget.js", async: true });
    script.dataset.ihubPreview = "true";
    const done = () => setReady(true);
    script.addEventListener("load", done);
    if (!existing) document.head.appendChild(script);
    return () => script.removeEventListener("load", done);
  }, []);
  return ready;
}

function WidgetBuilder({
  app,
  available,
  hubOrigin,
}: {
  app: DeveloperAppView;
  available: MethodView[];
  hubOrigin: string;
}) {
  const [methods, setMethods] = useState<string[]>(() => app.methods.map((method) => method.id));
  const [theme, setTheme] = useState<"light" | "dark">(app.widgetTheme);
  const [redirectUri, setRedirectUri] = useState(app.redirectUris[0] ?? "");
  const [scope, setScope] = useState("profile");
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const preview = useRef<HTMLDivElement>(null);
  const ready = useWidgetScript();
  const first = useRef(true);

  const shown = useMemo(
    () => available.filter((method) => methods.includes(method.id)),
    [available, methods],
  );

  // Re-render the live preview on every change.
  useEffect(() => {
    if (!ready || !preview.current || !window.IdentityHub) return;
    void window.IdentityHub.mount(preview.current, {
      hub: hubOrigin,
      clientId: app.clientId,
      redirectUri,
      scope,
      preview: true,
      config: { name: app.name, theme, methods: shown },
    });
  }, [ready, shown, theme, redirectUri, scope, app.clientId, app.name, hubOrigin]);

  // Save methods and theme shortly after each change; live widgets pick them up within a minute.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (methods.length === 0) {
      setStatus("error");
      setError("Keep at least one sign-in method.");
      return;
    }
    setStatus("saving");
    const timer = window.setTimeout(async () => {
      try {
        const result = await saveWidget({ data: { appId: app.id, methods, theme } });
        if (result.ok) {
          setStatus("saved");
          setError(null);
        } else {
          setStatus("error");
          setError(result.error);
        }
      } catch {
        setStatus("error");
        setError("Could not save. Check your connection.");
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [methods, theme, app.id]);

  const snippet = [
    `<div id="identity-hub"></div>`,
    `<script src="${hubOrigin}/widget.js"`,
    `        data-client-id="${app.clientId}"`,
    `        data-redirect-uri="${redirectUri}"`,
    `        data-scope="${scope}" async></script>`,
  ].join("\n");

  const toggle = (id: string) =>
    setMethods((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">Sign-in widget</h2>
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {status === "saving"
            ? "Saving..."
            : status === "saved"
              ? "All changes saved"
              : "Not saved"}
        </p>
      </div>
      <p className="mt-1 text-muted">
        Choose how people sign in to {app.name}. The preview and the code update as you go.
      </p>
      <ErrorNote message={error} />

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="grid content-start gap-6">
          <fieldset>
            <legend className="text-sm font-semibold">Sign-in methods</legend>
            {available.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No method is configured on this hub yet.</p>
            ) : null}
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {available.map((method) => (
                <label
                  key={method.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-line px-4 py-2"
                >
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={methods.includes(method.id)}
                    onChange={() => toggle(method.id)}
                  />
                  <PlatformIcon
                    id={method.id === "password" ? "mail" : method.id}
                    className="size-5 shrink-0"
                  />
                  <span className="font-medium">
                    {method.id === "password" ? "Email and password" : method.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold">Theme</legend>
            <div className="mt-2 flex gap-2">
              {(["light", "dark"] as const).map((value) => (
                <label
                  key={value}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4"
                >
                  <input
                    type="radio"
                    name="theme"
                    checked={theme === value}
                    onChange={() => setTheme(value)}
                  />
                  <span className="text-sm font-medium capitalize">{value}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-sm font-semibold">
            Return people to
            <select
              value={redirectUri}
              onChange={(event) => setRedirectUri(event.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-line bg-bg px-3 font-normal"
            >
              {app.redirectUris.map((uri) => (
                <option key={uri} value={uri}>
                  {uri}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold">
            Ask for
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-line bg-bg px-3 font-normal"
            >
              <option value="profile">Sign-in only (profile)</option>
              <option value="profile publish">Sign-in and posting (profile, publish)</option>
            </select>
          </label>
        </div>

        <div className="grid content-start gap-4">
          <div className={`rounded-2xl p-6 ${theme === "dark" ? "bg-ink" : "bg-bg-alt"}`}>
            <p
              className={`mb-4 text-sm font-semibold ${theme === "dark" ? "text-on-ink-muted" : "text-muted"}`}
            >
              Preview
            </p>
            <div ref={preview} />
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Paste this where the sign-in should appear</p>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink"
                onClick={async () => {
                  await navigator.clipboard.writeText(snippet);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                {copied ? "Copied" : "Copy code"}
              </button>
            </div>
            <pre className="mt-2 overflow-x-auto whitespace-pre rounded-2xl bg-ink p-4 font-sans text-sm leading-relaxed text-on-ink">
              {snippet}
            </pre>
            <p className="mt-2 text-sm text-muted">
              Your callback receives <span className="font-medium text-fg">code</span> and{" "}
              <span className="font-medium text-fg">state</span>. Check that state equals the{" "}
              <span className="font-medium text-fg">ihub_state</span> cookie the widget set, then
              exchange the code on your server. See Docs.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
