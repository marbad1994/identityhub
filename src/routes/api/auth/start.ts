import { createFileRoute } from "@tanstack/react-router";

// GET /api/auth/start?platform=twitter&intent=login|connect&return_to=/path
export const Route = createFileRoute("/api/auth/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { beginAuthorization, safeReturnTo } = await import("@/server/oauth");
        const { sessionUser } = await import("@/server/session");
        const { redirect } = await import("@/server/http");
        const url = new URL(request.url);
        const intent = url.searchParams.get("intent") === "connect" ? "connect" : "login";
        const result = await beginAuthorization({
          provider: url.searchParams.get("platform") ?? "",
          intent,
          returnTo: safeReturnTo(url.searchParams.get("return_to"), "/workspace"),
          user: await sessionUser(request),
        });
        return redirect(result.location);
      },
    },
  },
});
