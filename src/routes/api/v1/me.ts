import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/v1/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { me } = await import("@/server/apps");
        const { apiResponse } = await import("@/server/http");
        return apiResponse(() => me(request));
      },
    },
  },
});
