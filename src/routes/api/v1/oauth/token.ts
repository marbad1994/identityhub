import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/v1/oauth/token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { exchangeCode } = await import("@/server/apps");
        const { apiResponse } = await import("@/server/http");
        return apiResponse(() => exchangeCode(request));
      },
    },
  },
});
