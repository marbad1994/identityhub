import { createFileRoute } from "@tanstack/react-router";

// GET /api/v1/relay/<id>: polled by a page (on the hub or, via the widget, on
// another site) while its sign-in popup is open. Answers {"status":"pending"}
// until the popup finishes, then {"status":"done","location":...} once.
const cors = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET" };

export const Route = createFileRoute("/api/v1/relay/$relayId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { takeRelay, validRelay } = await import("@/server/relay");
        const headers = { ...cors, "cache-control": "no-store" };
        if (!validRelay(params.relayId)) {
          return Response.json({ error: "invalid_request" }, { status: 400, headers });
        }
        const location = await takeRelay(params.relayId);
        return Response.json(location ? { status: "done", location } : { status: "pending" }, {
          headers,
        });
      },
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
    },
  },
});
