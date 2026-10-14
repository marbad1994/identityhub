import { createRouter } from "@tanstack/react-router";
import { createIsomorphicFn, getGlobalStartContext } from "@tanstack/react-start";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

/** The per-request CSP nonce set by the security middleware in src/start.ts. */
const cspNonce = createIsomorphicFn()
  .server(() => (getGlobalStartContext() as { nonce?: string } | undefined)?.nonce)
  .client(() => document.querySelector<HTMLMetaElement>('meta[property="csp-nonce"]')?.content);

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    ssr: { nonce: cspNonce() },
  });
}
