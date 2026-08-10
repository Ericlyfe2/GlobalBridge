"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";

export type PushState =
  | "unsupported"   // browser or platform can't do it (e.g. iOS Safari < 16.4, or not installed)
  | "unconfigured"  // server has no VAPID keys
  | "default"       // supported, never asked
  | "granted"       // subscribed
  | "denied";       // user said no — we must never ask again

/**
 * Web push subscription lifecycle.
 *
 * Permission is requested ONLY from `subscribe()`, which is wired to an
 * explicit user action. Nothing here prompts on mount. Asking for notification
 * permission on page load is the single fastest way to get permanently blocked,
 * and a block is irreversible without the user digging through browser settings.
 *
 * Everything degrades: unsupported platforms, missing VAPID keys and denied
 * permission all resolve to a state the UI can render calmly, and the in-app
 * notification list keeps working regardless.
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>("default");
  const [busy, setBusy] = useState(false);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    if (!supported) {
      setState("unsupported");
      return;
    }
    let cancelled = false;

    (async () => {
      // Server may not have VAPID configured; there's no point offering it.
      try {
        const res = await fetch("/api/content/push/key");
        const { enabled } = await res.json();
        if (!enabled) {
          if (!cancelled) setState("unconfigured");
          return;
        }
      } catch {
        if (!cancelled) setState("unconfigured");
        return;
      }

      if (cancelled) return;
      if (Notification.permission === "denied") return setState("denied");
      if (Notification.permission === "default") return setState("default");

      // Permission granted — but that alone doesn't mean this device is
      // subscribed. Check for an actual subscription.
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!cancelled) setState(sub ? "granted" : "default");
    })();

    return () => { cancelled = true; };
  }, [supported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "default");
        return false;
      }

      const keyRes = await fetch("/api/content/push/key");
      const { key } = await keyRes.json();
      if (!key) {
        setState("unconfigured");
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          // Required by Chrome: we must be able to show a notification for
          // every push received, so silent background pushes are not allowed.
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        }));

      const json = sub.toJSON();
      const res = await authFetch("/api/content/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("subscribe failed");

      setState("granted");
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await authFetch("/api/content/push/unsubscribe", {
          method: "POST",
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("default");
    } finally {
      setBusy(false);
    }
  }, [supported]);

  return { state, busy, subscribe, unsubscribe };
}

/**
 * VAPID keys are distributed base64url, but PushManager wants a Uint8Array of
 * the raw bytes. Passing the string straight through fails with an opaque
 * InvalidCharacterError, so the conversion is explicit.
 */
// The explicit `Uint8Array<ArrayBuffer>` matters: since TS 5.7 a bare
// Uint8Array may be backed by a SharedArrayBuffer, which `applicationServerKey`
// does not accept. Allocating the ArrayBuffer up front pins the right type.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalised);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
