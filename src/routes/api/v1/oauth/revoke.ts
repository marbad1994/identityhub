import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/v1/oauth/revoke")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { revokeToken } = await import("@/server/apps");
        const { apiResponse } = await import("@/server/http");
        return apiResponse(() => revokeToken(request));
      },
    },
  },
});
