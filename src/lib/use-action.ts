import { useState } from "react";
import { useRouter } from "@tanstack/react-router";

type Outcome = { ok: true } | { ok: false; error: string };

/** Run a mutation, refresh the page data, and surface any error. */
export function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const run = async <T extends Outcome>(work: () => Promise<T>): Promise<T | null> => {
    setError(null);
    try {
      const result = await work();
      if (!result.ok) setError(result.error);
      await router.invalidate();
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      return null;
    }
  };
  return { error, run };
}
