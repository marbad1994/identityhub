import { createIsomorphicFn, getGlobalStartContext } from "@tanstack/react-start";

/** Use the document's nonce for styles added during both SSR and client navigation. */
export const cspNonce = createIsomorphicFn()
  .server(() => (getGlobalStartContext() as { nonce?: string } | undefined)?.nonce)
  .client(() => document.querySelector<HTMLMetaElement>('meta[property="csp-nonce"]')?.content);
