import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useBlocker, useLoaderData } from "@tanstack/react-router";
import { Check, Copy, ExternalLink, Monitor, Smartphone } from "lucide-react";
import { saveWidget } from "@/lib/api";
import { PlatformIcon } from "@/components/marks";
import { ErrorNote } from "@/components/shell";
import type { DeveloperAppView } from "@/server/workspace";
import type { MethodView } from "@/server/methods";
import { appHead } from "@/lib/app-title";
import { WIDGET_ACCENTS, type WidgetAccent } from "@/lib/widget-appearance";

export const Route = createFileRoute("/apps/$appId/widget")({
  head: appHead("Widget"),
  component: WidgetPage,
});

declare global {
  interface Window {
    IdentityHub?: {
      mount: (element: HTMLElement, options: Record<string, unknown>) => Promise<void>;
    };
  }
}

function WidgetPage() {
  const { app, available, hubOrigin } = useLoaderData({ from: "/apps/$appId" });
  return <WidgetBuilder key={app.id} app={app} available={available} hubOrigin={hubOrigin} />;
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
  const [accent, setAccent] = useState<WidgetAccent>(app.widgetAccent);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [redirectUri, setRedirectUri] = useState(app.redirectUris[0] ?? "");
  const [scope, setScope] = useState("profile");
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const preview = useRef<HTMLDivElement>(null);
  const ready = useWidgetScript();
  const first = useRef(true);
  const methodsRef = useRef(methods);
  const themeRef = useRef(theme);
  const accentRef = useRef(accent);
  const timer = useRef<number | null>(null);
  const saving = useRef<Promise<boolean> | null>(null);
  const flushOwned = useRef(false);
  const mounted = useRef(true);
  methodsRef.current = methods;
  themeRef.current = theme;
  accentRef.current = accent;

  const persist = (quiet: boolean): Promise<boolean> => {
    // The request in flight compares the refs when it settles and writes again
    // if they moved, so a newer edit is not dropped on the older promise.
    if (saving.current) return saving.current;
    const nextMethods = methodsRef.current.slice();
    const nextTheme = themeRef.current;
    const nextAccent = accentRef.current;
    const same = () =>
      themeRef.current === nextTheme &&
      accentRef.current === nextAccent &&
      methodsRef.current.length === nextMethods.length &&
      methodsRef.current.every((id, index) => id === nextMethods[index]);
    if (nextMethods.length === 0) {
      if (mounted.current) {
        setStatus("error");
        setError("Keep at least one sign-in method.");
      }
      return Promise.resolve(false);
    }
    if (!quiet && mounted.current) setStatus("saving");
    const slot: { current: Promise<boolean> | null } = { current: null };
    slot.current = (async () => {
      let saved = false;
      try {
        const result = await saveWidget({
          data: { appId: app.id, methods: nextMethods, theme: nextTheme, accent: nextAccent },
        });
        saved = result.ok;
        if (!result.ok && mounted.current) {
          setStatus("error");
          setError(result.error);
        }
      } catch {
        if (mounted.current) {
          setStatus("error");
          setError("Could not save. Check your connection.");
        }
      } finally {
        if (saving.current === slot.current) saving.current = null;
      }
      if (!same()) return persist(quiet);
      if (saved && !quiet && mounted.current) {
        setStatus("saved");
        setError(null);
      }
      return saved;
    })();
    saving.current = slot.current;
    return slot.current;
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Clearing the debounce is safe: the request in flight writes the refs again when they differ.
  useBlocker({
    shouldBlockFn: async () => {
      if (timer.current === null && !saving.current) return false;
      flushOwned.current = true;
      const pending = timer.current;
      if (pending !== null) {
        window.clearTimeout(pending);
        timer.current = null;
      }
      try {
        const ok = await (saving.current ?? persist(true));
        return !ok;
      } finally {
        flushOwned.current = false;
      }
    },
    enableBeforeUnload: () => timer.current !== null || saving.current !== null,
  });

  const shown = useMemo(
    () => available.filter((method) => methods.includes(method.id)),
    [available, methods],
  );

  useEffect(() => {
    if (!ready || !preview.current || !window.IdentityHub) return;
    void window.IdentityHub.mount(preview.current, {
      hub: hubOrigin,
      clientId: app.clientId,
      redirectUri,
      scope,
      preview: true,
      config: { name: app.name, theme, accent, methods: shown },
    });
  }, [ready, shown, theme, accent, redirectUri, scope, app.clientId, app.name, hubOrigin]);

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
    const id = window.setTimeout(() => {
      if (timer.current === id) timer.current = null;
      void persist(false);
    }, 400);
    timer.current = id;
    return () => {
      if (flushOwned.current) return;
      window.clearTimeout(id);
      if (timer.current === id) timer.current = null;
    };
  }, [methods, theme, accent, app.id]);

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
    <section className="mt-8">
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
        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
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

          <fieldset>
            <legend className="text-sm font-semibold">Accent color</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {WIDGET_ACCENTS.map((value) => (
                <label
                  key={value}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-3"
                >
                  <input
                    type="radio"
                    name="accent"
                    checked={accent === value}
                    onChange={() => setAccent(value)}
                  />
                  <span
                    className={`size-3 rounded-full ${value === "sage" ? "bg-[#315d4c]" : value === "blue" ? "bg-[#285b87]" : "bg-[#66508d]"}`}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium">
                    {{ sage: "Sage", blue: "Ocean", violet: "Iris" }[value]}
                  </span>
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

        <div className="grid min-w-0 grid-cols-1 content-start gap-4">
          <div
            className={`min-w-0 rounded-2xl border border-line p-4 sm:p-6 ${theme === "dark" ? "bg-[#101815]" : "bg-[#edf1ed]"}`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <p
                className={`text-sm font-semibold ${theme === "dark" ? "text-on-ink-muted" : "text-muted"}`}
              >
                Preview
              </p>
              <div className="flex gap-1 rounded-xl border border-line p-1">
                <button
                  type="button"
                  aria-label="Desktop preview"
                  aria-pressed={device === "desktop"}
                  className={`inline-flex size-11 items-center justify-center rounded-lg ${device === "desktop" ? "bg-bg text-fg" : "text-muted"}`}
                  onClick={() => setDevice("desktop")}
                >
                  <Monitor className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Mobile preview"
                  aria-pressed={device === "mobile"}
                  className={`inline-flex size-11 items-center justify-center rounded-lg ${device === "mobile" ? "bg-bg text-fg" : "text-muted"}`}
                  onClick={() => setDevice("mobile")}
                >
                  <Smartphone className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <p className={`mb-4 text-sm ${theme === "dark" ? "text-on-ink-muted" : "text-muted"}`}>
              Visitors see Sign in first. This previews the choices that open from it; it does not
              sign you in.
            </p>
            <div
              className={`mx-auto w-full ${device === "mobile" ? "max-w-[340px]" : "max-w-[404px]"}`}
              ref={preview}
            />
            <a
              href="/widget-demo.html"
              target="_blank"
              rel="noreferrer"
              className={`mt-5 inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4 ${theme === "dark" ? "text-on-ink" : "text-fg"}`}
            >
              <ExternalLink className="size-4" aria-hidden="true" /> Try the interactive demo
            </a>
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Paste this where the sign-in should appear</p>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(snippet);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  } catch {
                    setError("Could not copy automatically. Select and copy the code below.");
                  }
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
            <pre className="mt-2 min-w-0 max-w-full overflow-x-auto whitespace-pre rounded-2xl bg-ink p-4 font-sans text-sm leading-relaxed text-on-ink">
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
