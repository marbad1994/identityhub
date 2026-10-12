import { useLoaderData } from "@tanstack/react-router";

/** The signed-in user (or null) and the platforms enabled for sign-in, loaded by the root route. */
export function useSession() {
  return useLoaderData({ from: "__root__" });
}
