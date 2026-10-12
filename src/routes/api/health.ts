import { createFileRoute } from "@tanstack/react-router";

// Liveness plus a database round trip, for the container healthcheck.
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const { one } = await import("@/server/db");
        try {
          await one("select 1");
          return Response.json({ status: "ok" });
        } catch {
          return Response.json({ status: "database_unavailable" }, { status: 503 });
        }
      },
    },
  },
});
