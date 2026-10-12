import { ApiError } from "./apps";

export function redirect(location: string, setCookie?: string): Response {
  const headers = new Headers({ location, "cache-control": "no-store" });
  if (setCookie) headers.append("set-cookie", setCookie);
  return new Response(null, { status: 302, headers });
}

/** Run an app API handler, mapping ApiError to an OAuth-style JSON error. */
export async function apiResponse(work: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await work(), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.code, error_description: error.message }, { status: error.status, headers: { "cache-control": "no-store" } });
    }
    console.error("[api]", error);
    return Response.json({ error: "server_error", error_description: "Unexpected error." }, { status: 500 });
  }
}
