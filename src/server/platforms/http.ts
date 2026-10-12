export const USER_AGENT = "IdentityHub/1.0 (by Makketing)";

export class PlatformError extends Error {}

type Json = Record<string, any>;

/** Fetch and parse JSON, turning a platform error body into a readable message. Never logs bodies: they carry tokens. */
export async function requestJson(
  platform: string,
  url: string,
  init: RequestInit = {},
): Promise<Json> {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: Json = {};
  try {
    body = text ? (JSON.parse(text) as Json) : {};
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  if (!response.ok) {
    const nested = typeof body.error === "object" && body.error ? body.error.message : undefined;
    const message =
      body.error_description ??
      body.message ??
      nested ??
      body.error ??
      body.raw ??
      `HTTP ${response.status}`;
    throw new PlatformError(`${platform} rejected the request: ${String(message)}`);
  }
  return body;
}

export function form(values: Record<string, string>): URLSearchParams {
  return new URLSearchParams(values);
}

export function basicAuth(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, accept: "application/json" };
}

export function expiresAt(expiresIn: unknown): Date | null {
  const seconds = Number(expiresIn);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(Date.now() + seconds * 1000) : null;
}

export function withQuery(base: string, params: Record<string, string | undefined>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params))
    if (value !== undefined) url.searchParams.set(key, value);
  return url.toString();
}
