import { createFileRoute } from "@tanstack/react-router";

// The link in confirmation emails: /api/auth/verify-email?token=...
export const Route = createFileRoute("/api/auth/verify-email")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { confirmEmail } = await import("@/server/password-auth");
        const { requestContext } = await import("@/server/request");
        const { redirect } = await import("@/server/http");
        const token = new URL(request.url).searchParams.get("token") ?? "";
        const result = await confirmEmail(token, requestContext(request));
        return redirect(result.location, result.setCookie);
      },
    },
  },
});
