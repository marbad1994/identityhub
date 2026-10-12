import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { applyStripeEvent } = await import("@/lib/broker/hub.server");
        return applyStripeEvent(await request.text(), request.headers.get("stripe-signature"));
      },
    },
  },
});
