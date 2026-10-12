import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { finishOAuth } = await import("@/lib/broker/hub.server");
        const location = await finishOAuth(request.url);
        return new Response(null, { status: 302, headers: { location } });
      },
    },
  },
});
