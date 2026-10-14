import { createFileRoute } from "@tanstack/react-router";

// Public, read-only config for the embeddable widget (public/widget.js). Any
// site may read it: it holds nothing but the app name and its sign-in methods.
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET",
  "access-control-max-age": "86400",
};

export const Route = createFileRoute("/api/v1/widget/$clientId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { widgetConfig } = await import("@/server/apps");
        const { apiResponse } = await import("@/server/http");
        const response = await apiResponse(() => widgetConfig(params.clientId));
        for (const [name, value] of Object.entries(cors)) response.headers.set(name, value);
        // Short cache so settings changes reach live widgets within a minute.
        if (response.ok) response.headers.set("cache-control", "public, max-age=60");
        return response;
      },
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
    },
  },
});
