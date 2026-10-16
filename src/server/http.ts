import { getGlobalStartContext } from "@tanstack/react-start";
import { ApiError } from "./apps";

function appendCookies(headers: Headers, setCookie?: string | string[]): void {
  if (!setCookie) return;
  for (const cookie of Array.isArray(setCookie) ? setCookie : [setCookie]) {
    headers.append("set-cookie", cookie);
  }
}

export function redirect(location: string, setCookie?: string | string[]): Response {
  const headers = new Headers({ location, "cache-control": "no-store" });
  appendCookies(headers, setCookie);
  return new Response(null, { status: 302, headers });
}

/** Run an app API handler, mapping ApiError to an OAuth-style JSON error. */
export async function apiResponse(work: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await work(), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json(
        { error: error.code, error_description: error.message },
        { status: error.status, headers: { "cache-control": "no-store" } },
      );
    }
    console.error("[api]", error);
    return Response.json(
      { error: "server_error", error_description: "Unexpected error." },
      { status: 500 },
    );
  }
}

/**
 * The last page a sign-in popup shows: it closes itself. The opener learns
 * the result by polling the relay, so this works even when the platform cut
 * the popup's link to its opener; if the browser refuses to close a window
 * the hub did not open itself, the message stays.
 */
export function popupDone(message: string, setCookie?: string | string[]): Response {
  const nonce = (getGlobalStartContext() as { nonce?: string } | undefined)?.nonce ?? "";
  const escaped = message.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Identity Hub</title>
<style nonce="${nonce}">body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:"Inter Variable",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111;background:#fff}p{margin:0;padding:24px;text-align:center;font-size:17px;line-height:1.5}</style></head>
<body><p>${escaped}<br>You can close this window.</p>
<script nonce="${nonce}">window.close();</script></body></html>`;
  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  appendCookies(headers, setCookie);
  return new Response(html, { status: 200, headers });
}
