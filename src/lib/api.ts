import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Server functions the pages call. Each resolves the session from the request cookie. */

const requireUser = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { currentUser } = await import("@/server/request");
  const user = await currentUser();
  if (!user) throw new Error("Sign in first.");
  return next({ context: { user } });
});

/** The signed-in user (or null) and every sign-in method this hub offers. */
export const fetchSession = createServerFn({ method: "GET" }).handler(async () => {
  const { availableMethods } = await import("@/server/methods");
  const { currentUser } = await import("@/server/request");
  return { user: await currentUser(), methods: availableMethods() };
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
  .validator(z.object({ password: z.string().max(1024).optional() }))
  .handler(async ({ context, data }) => {
    const { deleteUser } = await import("@/server/workspace");
    const { confirmDeletion } = await import("@/server/password-auth");
    const denied = await confirmDeletion(context.user, data.password);
    if (denied) return denied;
    await deleteUser(context.user.id);
    return { ok: true as const };
  });

const authorizeRequest = z.object({
  clientId: z.string().max(80),
  redirectUri: z.string().max(500),
  state: z.string().max(500).optional(),
  scope: z.string().max(100).optional(),
  relay: z.string().max(100).optional(),
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

// ---------------------------------------------------------------------------
// Developer apps and the sign-in widget
// ---------------------------------------------------------------------------

export const fetchDeveloperApps = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { listDeveloperApps } = await import("@/server/workspace");
    return listDeveloperApps(context.user.id);
  });

export const fetchDeveloperApp = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(z.object({ appId: z.string().max(64) }))
  .handler(async ({ context, data }) => {
    const { getDeveloperApp } = await import("@/server/workspace");
    const { availableMethods } = await import("@/server/methods");
    const { appOrigin } = await import("@/server/env");
    const app = await getDeveloperApp(context.user.id, data.appId);
    const { listAppMembers } = await import("@/server/workspace");
    return {
      app,
      members: app ? await listAppMembers(context.user.id, data.appId) : [],
      available: availableMethods(),
      hubOrigin: appOrigin(),
    };
  });

export const removeAppMember = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ appId: z.string().max(64), userId: z.string().max(64) }))
  .handler(async ({ context, data }) => {
    const { removeAppMember } = await import("@/server/workspace");
    return removeAppMember(context.user.id, data.appId, data.userId);
  });

export const saveWidget = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      appId: z.string().max(64),
      methods: z.array(z.string().max(20)).max(20),
      theme: z.string().max(10),
    }),
  )
  .handler(async ({ context, data }) => {
    const { updateWidget } = await import("@/server/workspace");
    return updateWidget(context.user.id, data);
  });

// ---------------------------------------------------------------------------
// Email and password
// ---------------------------------------------------------------------------

/** Long enough for any real password, short enough to bound hashing work. */
const password = z.string().max(1024);
const email = z.string().max(320);

async function withContext() {
  const { requestContext, setCookies } = await import("@/server/request");
  return { ctx: requestContext(), setCookies };
}

export const signUp = createServerFn({ method: "POST" })
  .validator(
    z.object({ name: z.string().max(200), email, password, returnTo: z.string().max(2000) }),
  )
  .handler(async ({ data }) => {
    const { signUp } = await import("@/server/password-auth");
    return signUp(data, (await withContext()).ctx);
  });

export const logIn = createServerFn({ method: "POST" })
  .validator(z.object({ email, password, returnTo: z.string().max(2000) }))
  .handler(async ({ data }) => {
    const { login } = await import("@/server/password-auth");
    const { ctx, setCookies } = await withContext();
    const result = await login(data, ctx);
    if (!result.ok) return result;
    setCookies(result.setCookies);
    return "mfaRequired" in result
      ? { ok: true as const, mfaRequired: true as const }
      : { ok: true as const, redirect: result.redirect };
  });

export const logInSecondFactor = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string().max(40) }))
  .handler(async ({ data }) => {
    const { loginSecondFactor, challengeCookieName } = await import("@/server/password-auth");
    const { getCookie } = await import("@tanstack/react-start/server");
    const { ctx, setCookies } = await withContext();
    const result = await loginSecondFactor(data, getCookie(challengeCookieName()) ?? null, ctx);
    if (!result.ok) return result;
    setCookies(result.setCookies);
    return { ok: true as const, redirect: result.redirect };
  });

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator(z.object({ email }))
  .handler(async ({ data }) => {
    const { requestPasswordReset } = await import("@/server/password-auth");
    return requestPasswordReset(data, (await withContext()).ctx);
  });

export const checkResetToken = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().max(200) }))
  .handler(async ({ data }) => {
    const { resetTokenValid } = await import("@/server/password-auth");
    return { valid: await resetTokenValid(data.token) };
  });

export const resetPassword = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().max(200), password }))
  .handler(async ({ data }) => {
    const { resetPassword } = await import("@/server/password-auth");
    return resetPassword(data, (await withContext()).ctx);
  });

// ---------------------------------------------------------------------------
// Account security settings
// ---------------------------------------------------------------------------

export const fetchSecurity = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { securityView } = await import("@/server/password-auth");
    return securityView(context.user);
  });

export const addEmailAndPassword = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ email, password }))
  .handler(async ({ context, data }) => {
    const { addEmailAndPassword } = await import("@/server/password-auth");
    return addEmailAndPassword(context.user, data);
  });

export const changePassword = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ current: password, next: password }))
  .handler(async ({ context, data }) => {
    const { changePassword } = await import("@/server/password-auth");
    return changePassword(context.user, data, (await withContext()).ctx);
  });

export const beginTwoFactor = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { beginTwoFactor } = await import("@/server/password-auth");
    return beginTwoFactor(context.user);
  });

export const enableTwoFactor = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ code: z.string().max(20) }))
  .handler(async ({ context, data }) => {
    const { enableTwoFactor } = await import("@/server/password-auth");
    return enableTwoFactor(context.user, data);
  });

export const disableTwoFactor = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ password }))
  .handler(async ({ context, data }) => {
    const { disableTwoFactor } = await import("@/server/password-auth");
    return disableTwoFactor(context.user, data);
  });

export const regenerateRecoveryCodes = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ password }))
  .handler(async ({ context, data }) => {
    const { regenerateRecoveryCodes } = await import("@/server/password-auth");
    return regenerateRecoveryCodes(context.user, data);
  });

export const signOutOtherSessions = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { signOutOtherSessions } = await import("@/server/password-auth");
    return signOutOtherSessions(context.user, (await withContext()).ctx);
  });
