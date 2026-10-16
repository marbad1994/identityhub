import { createFileRoute } from "@tanstack/react-router";

// The platforms' redirect target: {APP_ORIGIN}/api/auth/callback/<platform>, either directly
// or forwarded by SocialPostAPI when PLATFORM_CALLBACK_BASE reuses its registered callbacks.
export const Route = createFileRoute("/api/auth/callback/$platform")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { finishAuthorization } = await import("@/server/oauth");
        const { popupDone, redirect } = await import("@/server/http");
        const result = await finishAuthorization(params.platform, request);
        if (result.relayed) return popupDone("You are signed in.", result.setCookie);
        return redirect(result.location, result.setCookie);
      },
    },
  },
});
