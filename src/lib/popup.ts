/** Browser helpers for signing in through a popup window. */

/** 32 random bytes, base64url: the id the popup's result is stored under. */
export function newRelayId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Open a centered popup. Must run synchronously inside the click handler. Null when blocked. */
export function openPopup(url: string): Window | null {
  const width = 520;
  const height = 720;
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
  return window.open(
    url,
    "identity-hub-signin",
    `popup,width=${width},height=${height},left=${left},top=${top}`,
  );
}

/**
 * Poll the relay until the popup finishes. Resolves with the location to go
 * to, or null when cancelled or after 15 minutes.
 */
export async function waitForRelay(relay: string, signal: AbortSignal): Promise<string | null> {
  const deadline = Date.now() + 15 * 60 * 1000;
  while (!signal.aborted && Date.now() < deadline) {
    try {
      const response = await fetch(`/api/v1/relay/${relay}`, { signal, cache: "no-store" });
      const body = (await response.json()) as { status?: string; location?: string };
      if (body.status === "done" && body.location) return body.location;
    } catch {
      if (signal.aborted) return null;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return null;
}
