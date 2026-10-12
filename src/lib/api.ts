import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Server functions the pages call. Each resolves the session from the request cookie. */

const requireUser = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { currentUser } = await import("@/server/request");
  const user = await currentUser();
  if (!user) throw new Error("Sign in first.");
  return next({ context: { user } });
});

export const fetchSession = createServerFn({ method: "GET" }).handler(async () => {
  const { platformsForLogin } = await import("@/server/workspace");
  const { currentUser } = await import("@/server/request");
  return { user: await currentUser(), platforms: platformsForLogin() };
});

export const fetchWorkspace = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { getWorkspace } = await import("@/server/workspace");
    return getWorkspace(context.user);
  });

export const disconnectAccount = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ accountId: z.string().max(64) }))
  .handler(async ({ context, data }) => {
    const { disconnectAccount } = await import("@/server/workspace");
    return disconnectAccount(context.user.id, data.accountId);
  });

export const revokeApp = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ appId: z.string().max(64) }))
  .handler(async ({ context, data }) => {
    const { revokeApp } = await import("@/server/workspace");
    return revokeApp(context.user.id, data.appId);
  });

const appFields = z.object({
  name: z.string().max(60),
  homepageUrl: z.string().max(300),
  redirectUris: z.array(z.string().max(300)).max(10),
});

export const createApp = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(appFields)
  .handler(async ({ context, data }) => {
    const { createApp } = await import("@/server/workspace");
    return createApp(context.user.id, data);
  });

export const updateApp = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(appFields.extend({ appId: z.string().max(64) }))
  .handler(async ({ context, data }) => {
    const { updateApp } = await import("@/server/workspace");
    return updateApp(context.user.id, data);
  });

export const rotateAppSecret = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ appId: z.string().max(64) }))
  .handler(async ({ context, data }) => {
    const { rotateAppSecret } = await import("@/server/workspace");
    return rotateAppSecret(context.user.id, data.appId);
  });

export const deleteApp = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ appId: z.string().max(64) }))
  .handler(async ({ context, data }) => {
    const { deleteApp } = await import("@/server/workspace");
    return deleteApp(context.user.id, data.appId);
  });

export const deleteMyData = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { deleteUser } = await import("@/server/workspace");
    await deleteUser(context.user.id);
    return { ok: true as const };
  });

const authorizeRequest = z.object({
  clientId: z.string().max(80),
  redirectUri: z.string().max(500),
  state: z.string().max(500).optional(),
  scope: z.string().max(100).optional(),
});

export const fetchConsent = createServerFn({ method: "GET" })
  .validator(authorizeRequest)
  .handler(async ({ data }) => {
    const { consentView } = await import("@/server/apps");
    const { currentUser } = await import("@/server/request");
    const user = await currentUser();
    return consentView(user?.id ?? null, data);
  });

export const approveConsent = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(authorizeRequest.extend({ accountIds: z.array(z.string().max(64)).max(100) }))
  .handler(async ({ context, data }) => {
    const { approve } = await import("@/server/apps");
    return approve(context.user.id, data);
  });

export const denyConsent = createServerFn({ method: "POST" })
  .validator(authorizeRequest)
  .handler(async ({ data }) => {
    const { deny } = await import("@/server/apps");
    return deny(data);
  });
