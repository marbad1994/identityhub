import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/embed-handoff")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { redeemEmbedHandoff } = await import("@/server/password-auth");
        const { requestContext } = await import("@/server/request");
        const { redirect } = await import("@/server/http");
        const token = new URL(request.url).searchParams.get("token") ?? "";
        const result = await redeemEmbedHandoff(token, requestContext(request));
        return redirect(result.location, result.setCookie);
      },
    },
  },
});
