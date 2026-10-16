import { useEffect } from "react";

export type EmbedNotice = "popup-blocked" | "cookies-blocked" | "dismiss" | "ready" | "reset-sent";

/** Parent origin must already be on the frame-ancestors allowlist. Otherwise stay silent. */
export function postEmbed(parentOrigin: string | undefined, allowed: boolean, type: EmbedNotice) {
  if (!allowed || !parentOrigin || window.parent === window) return;
  window.parent.postMessage({ source: "identity-hub", v: 1, type }, parentOrigin);
}

/** Same-origin only. The widget beacons handshake-timeout itself, so this is not that reason. */
export function reportEmbed(reason: "cookies-blocked" | "popup-blocked") {
  void fetch("/api/auth/embed-report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason }),
  }).catch(() => undefined);
}

export function EmbedBridge({
  parentOrigin,
  allowed,
  type = "ready",
  dismissOnEscape = false,
}: {
  parentOrigin?: string;
  allowed: boolean;
  type?: "ready" | "reset-sent";
  dismissOnEscape?: boolean;
}) {
  useEffect(() => {
    postEmbed(parentOrigin, allowed, type);
  }, [parentOrigin, allowed, type]);

  useEffect(() => {
    if (!dismissOnEscape) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") postEmbed(parentOrigin, allowed, "dismiss");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismissOnEscape, parentOrigin, allowed]);

  return null;
}
