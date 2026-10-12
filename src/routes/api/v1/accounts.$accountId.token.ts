import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/v1/accounts/$accountId/token")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { accountToken } = await import("@/server/apps");
        const { apiResponse } = await import("@/server/http");
        return apiResponse(() => accountToken(request, params.accountId));
      },
    },
  },
});
