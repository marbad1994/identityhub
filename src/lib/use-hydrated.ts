import { useEffect, useState } from "react";

/** Keep client-only actions disabled until their event handlers are attached. */
export function useHydrated(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
