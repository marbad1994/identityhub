import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/oauth/token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as { client_id?: string; client_secret?: string; code?: string } | null;
        if (!body?.client_id || !body.client_secret || !body.code) {
          return Response.json({ error: "invalid_request" }, { status: 400 });
        }
        const { exchangeCode } = await import("@/lib/broker/hub.server");
        const result = await exchangeCode({ clientId: body.client_id, clientSecret: body.client_secret, code: body.code });
        if ("error" in result) return Response.json(result, { status: 401 });
        return Response.json(result);
      },
    },
  },
});
