import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { destroySession } = await import("@/server/session");
        const { redirect } = await import("@/server/http");
        return redirect("/", await destroySession(request));
      },
    },
  },
});
