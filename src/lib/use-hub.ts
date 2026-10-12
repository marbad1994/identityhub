import { useCallback, useEffect, useState } from "react";
import { initialHub, normalizeHub, type Hub, type Result } from "./hub";

const KEY = "makketing-identity-hub-v1";

function readHub(): Hub {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialHub();
    return normalizeHub(JSON.parse(raw));
  } catch {
    return initialHub();
  }
}

export function useHub() {
  const [hub, setHub] = useState<Hub>(initialHub);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHub(readHub());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify(hub));
  }, [hub, ready]);

  const commit = useCallback((result: Result) => {
    if (!result.ok) return result.error;
    setHub(result.hub);
    return undefined;
  }, []);

  const replace = useCallback((next: Hub) => {
    setHub(next);
  }, []);

  return { hub, ready, commit, replace };
}
