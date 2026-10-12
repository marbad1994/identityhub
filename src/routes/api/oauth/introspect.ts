import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/oauth/introspect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { introspect } = await import("@/lib/broker/hub.server");
        return Response.json(await introspect(request.headers.get("authorization")));
      },
    },
  },
});
