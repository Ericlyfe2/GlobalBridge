"use client";

import { useEffect, useState } from "react";

export type NetworkState = "online" | "offline" | "reconnecting";

/**
 * Connection state, shared by the offline banner, the WebSocket layer and Atlas.
 *
 * `navigator.onLine` alone is not trustworthy — it reports whether a network
 * interface exists, not whether anything is reachable. A captive portal, a dead
 * VPN or a router with no upstream all report `true`. So when the browser says
 * we're back, we verify with a real request before declaring "online", and sit
 * in `reconnecting` until it succeeds.
 *
 * The probe hits the backend health endpoint, so it also catches "internet is
 * fine but our API is down", which is the case users actually feel.
 */
export function useNetworkStatus(): NetworkState {
  // Start optimistic so SSR and first client paint agree — reading
  // navigator.onLine during render would be a hydration mismatch.
  const [state, setState] = useState<NetworkState>("online");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const probe = async (): Promise<boolean> => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        // cache: no-store so a cached 200 can't mask a dead network.
        await fetch("/api/health", { method: "HEAD", cache: "no-store", signal: ctrl.signal });
        clearTimeout(t);
        return true;
      } catch {
        return false;
      }
    };

    const verify = async () => {
      if (cancelled) return;
      setState("reconnecting");
      if (await probe()) {
        if (!cancelled) {
          attempt = 0;
          setState("online");
        }
        return;
      }
      if (cancelled) return;
      setState("offline");
      // Back off rather than hammering a dead connection: 2s → 30s.
      const delay = Math.min(2000 * 2 ** attempt, 30_000);
      attempt += 1;
      timer = setTimeout(verify, delay);
    };

    const goOffline = () => {
      if (timer) clearTimeout(timer);
      attempt = 0;
      setState("offline");
      timer = setTimeout(verify, 2000);
    };

    const goOnline = () => {
      if (timer) clearTimeout(timer);
      attempt = 0;
      verify();
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    // Trust the initial reading only when it says we're *offline* — a false
    // "online" is the common failure, a false "offline" essentially never happens.
    if (!navigator.onLine) goOffline();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  return state;
}

/** True when running as an installed app rather than a browser tab. */
export function useStandalone(): boolean {
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const read = () =>
      setStandalone(
        mq.matches ||
          // iOS Safari predates display-mode and uses a non-standard flag.
          (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
      );
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return standalone;
}
