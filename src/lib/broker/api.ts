import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import type { HubResult, HubView } from "./types";

async function originFromRequest(): Promise<string> {
  const { getRequest } = await import("@tanstack/react-start/server");
  return getRequest().url;
}

const scopes = z.array(z.string()).max(8);

export const fetchHub = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<HubView> => {
    const { getHub } = await import("./hub.server");
    return getHub(context.userId);
  });

export const connectSandboxAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ provider: z.string(), handle: z.string().max(40), displayName: z.string().max(60), scopes }))
  .handler(async ({ context, data }): Promise<HubResult> => {
    const { connectSandbox } = await import("./hub.server");
    return connectSandbox(context.userId, data);
  });

export const beginLiveConnect = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ provider: z.string(), scopes }))
  .handler(async ({ context, data }): Promise<HubResult> => {
    const { appOrigin, beginOAuth } = await import("./hub.server");
    return beginOAuth(context.userId, data, appOrigin(await originFromRequest()));
  });

export const disconnectConnection = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ connectionId: z.string() }))
  .handler(async ({ context, data }): Promise<HubResult> => {
    const { disconnectAccount } = await import("./hub.server");
    return disconnectAccount(context.userId, data.connectionId);
  });

export const registerProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ name: z.string().max(48), origin: z.string().max(200), description: z.string().max(140) }))
  .handler(async ({ context, data }): Promise<HubResult> => {
    const { addProduct } = await import("./hub.server");
    return addProduct(context.userId, data);
  });

export const hideProductSecret = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ productId: z.string() }))
  .handler(async ({ context, data }): Promise<HubResult> => {
    const { dismissProductSecret } = await import("./hub.server");
    return dismissProductSecret(context.userId, data.productId);
  });

export const removeProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ productId: z.string() }))
  .handler(async ({ context, data }): Promise<HubResult> => {
    const { deleteProduct } = await import("./hub.server");
    return deleteProduct(context.userId, data.productId);
  });

export const saveGrant = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ productId: z.string(), connectionId: z.string(), scopes }))
  .handler(async ({ context, data }): Promise<HubResult> => {
    const { setGrant } = await import("./hub.server");
    return setGrant(context.userId, data);
  });

export const saveWidget = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ name: z.string().max(40), theme: z.string(), providers: z.array(z.string()).max(8) }))
  .handler(async ({ context, data }): Promise<HubResult> => {
    const { updateWidget } = await import("./hub.server");
    return updateWidget(context.userId, data);
  });

export const loadSamples = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<HubResult> => {
    const { seedSample } = await import("./hub.server");
    return seedSample(context.userId);
  });

export const resetHub = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<HubView> => {
    const { resetWorkspace } = await import("./hub.server");
    return resetWorkspace(context.userId);
  });

export const eraseHub = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { deleteWorkspace } = await import("./hub.server");
    await deleteWorkspace(context.userId);
    return { ok: true as const };
  });

export const lookupProduct = createServerFn({ method: "GET" })
  .validator(z.object({ clientId: z.string().min(8).max(80) }))
  .handler(async ({ data }) => {
    const { publicProduct } = await import("./hub.server");
    return publicProduct(data.clientId);
  });

export const approveConnect = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      clientId: z.string(),
      connectionId: z.string(),
      scopes,
      redirectUri: z.string().max(300),
    }),
  )
  .handler(async ({ context, data }) => {
    const { issueCode } = await import("./hub.server");
    return issueCode(context.userId, data);
  });

export const openCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ plan: z.enum(["starter", "growth", "scale"]) }))
  .handler(async ({ context, data }) => {
    const { appOrigin, startCheckout } = await import("./hub.server");
    return startCheckout(context.userId, data.plan, appOrigin(await originFromRequest()));
  });

export const fetchConnectionsForConsent = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getHub } = await import("./hub.server");
    const hub = await getHub(context.userId);
    return { connections: hub.connections, products: hub.products };
  });
