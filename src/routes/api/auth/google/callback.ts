import { createFileRoute } from "@tanstack/react-router";

/** Exact redirect URI registered on the Google web client. */
export const Route = createFileRoute("/api/auth/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { finishAuthorization } = await import("@/server/oauth");
        const { popupDone, redirect } = await import("@/server/http");
        const result = await finishAuthorization("google", request);
        if (result.relayed) return popupDone("You are signed in.", result.setCookie);
        return redirect(result.location, result.setCookie);
      },
    },
  },
});
