import { createFileRoute } from "@tanstack/react-router";

const REASONS = new Set(["cookies-blocked", "handshake-timeout", "popup-blocked"]);

export const Route = createFileRoute("/api/auth/embed-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { hit } = await import("@/server/rate-limit");
        const { requestContext } = await import("@/server/request");
        let reason = "";
        try {
          const parsed = JSON.parse(await request.text()) as { reason?: unknown };
          if (typeof parsed.reason === "string") reason = parsed.reason;
        } catch {
          return new Response(null, { status: 400 });
        }
        if (!REASONS.has(reason)) return new Response(null, { status: 400 });
        const limit = await hit(`embed-report:${requestContext(request).ip}`, 30, 60);
        if (!limit.allowed) return new Response(null, { status: 429 });
        // Counter only. The iframe URL already has state and relay; do not copy it.
        console.info(`[embed-report] reason=${reason}`);
        return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
      },
    },
  },
});
