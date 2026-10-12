import { useEffect, useRef, useState } from "react";
import type { WidgetConfig } from "@/lib/hub";
import type { WidgetSelection } from "@/types/identity-hub";

function ensureScript(): Promise<void> {
  if (window.IdentityHub) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>("script[data-identity-hub]");
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.IdentityHub) resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Widget failed to load")), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/identity-hub-widget.js";
    script.dataset.identityHub = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Widget failed to load"));
    document.body.appendChild(script);
  });
}

export function WidgetFrame({
  config,
  onSelect,
}: {
  config: WidgetConfig;
  onSelect?: (detail: WidgetSelection) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const [error, setError] = useState<string | null>(null);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let dead = false;
    let mounted: { destroy: () => void } | undefined;
    setError(null);
    ensureScript()
      .then(() => {
        if (dead || !window.IdentityHub || !hostRef.current) return;
        mounted = window.IdentityHub.mount(hostRef.current, {
          appName: config.name,
          theme: config.theme,
          providers: config.providers,
          mode: "sandbox",
          onComplete: (detail) => onSelectRef.current?.(detail),
        });
      })
      .catch(() => {
        if (!dead) setError("The widget script did not load.");
      });
    return () => {
      dead = true;
      mounted?.destroy();
    };
  }, [config.name, config.theme, config.providers.join("|")]);

  return (
    <div>
      <div ref={hostRef} />
      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
