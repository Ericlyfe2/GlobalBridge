"use client";

/**
 * The PWA enhancement layer: service-worker lifecycle, connection banner,
 * update prompt and install prompt.
 *
 * Everything here is strictly additive. If the service worker fails to
 * register, if `beforeinstallprompt` never fires, or if the browser has no
 * Cache API at all, the app behaves exactly as it did before — no feature
 * depends on any of this succeeding.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, WifiOff, Download, X, Wifi } from "lucide-react";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { useNetworkStatus, useStandalone } from "@/lib/pwa/useNetworkStatus";
import { useMascot } from "@/mascot/MascotProvider";

/** Chrome's install event, which TypeScript's DOM lib doesn't model. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "gb-install-dismissed";
/** How long a dismissal is respected before we may ask again. */
const DISMISS_DAYS = 30;

export function PWAProvider() {
  const { t } = useTranslation();
  const status = useNetworkStatus();
  const standalone = useStandalone();
  const { emit } = useMascot();

  const [updateReady, setUpdateReady] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const waitingRef = useRef<ServiceWorker | null>(null);

  // ── Service worker registration ─────────────────────────────────────────
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Dev builds churn assets constantly; a worker there causes more confusion
    // than it solves.
    if (process.env.NODE_ENV !== "production") return;

    let cancelled = false;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (cancelled) return;

        // A worker already waiting means an update landed on a previous visit.
        if (reg.waiting) {
          waitingRef.current = reg.waiting;
          setUpdateReady(true);
        }

        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            // `controller` is null on the very first install — that's not an
            // update, it's the initial activation, and must not prompt.
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              waitingRef.current = next;
              setUpdateReady(true);
            }
          });
        });
      })
      .catch(() => {
        // Registration failure is non-fatal by design.
      });

    // When the new worker takes control, reload once to avoid mixing old and
    // new chunks. The guard prevents a reload loop.
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    waitingRef.current?.postMessage("SKIP_WAITING");
    setUpdateReady(false);
  }, []);

  // ── Install prompt capture ──────────────────────────────────────────────
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // Suppress Chrome's own mini-infobar so we can ask in context instead.
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  // Decide *whether* to surface it. Never on first paint, never if already
  // installed, never if recently dismissed — the prompt should feel earned.
  useEffect(() => {
    if (!installEvent || standalone) return;

    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    } catch {
      /* private mode — treat as never dismissed */
    }
    const since = Date.now() - dismissedAt;
    if (dismissedAt && since < DISMISS_DAYS * 864e5) return;

    // Let the user actually look at the page first.
    const to = setTimeout(() => setShowInstall(true), 25_000);
    return () => clearTimeout(to);
  }, [installEvent, standalone]);

  const install = useCallback(async () => {
    if (!installEvent) return;
    setShowInstall(false);
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "dismissed") {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    }
    setInstallEvent(null);
  }, [installEvent]);

  const dismissInstall = useCallback(() => {
    setShowInstall(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  }, []);

  // ── Atlas reacts to connection changes ──────────────────────────────────
  // Routed through the engine so the existing priority guard still applies:
  // these are ambient/info events and can never bury a scam warning.
  const prevStatus = useRef<typeof status>(status);
  useEffect(() => {
    const was = prevStatus.current;
    prevStatus.current = status;
    if (was === status) return;
    if (status === "offline") emit("CONNECTION_LOST");
    else if (status === "online" && was !== "online") emit("CONNECTION_RESTORED");
  }, [status, emit]);

  const offline = status === "offline";
  const reconnecting = status === "reconnecting";

  return (
    <>
      {/* Connection banner — a thin strip, not a modal. It must not block the
          UI, because plenty of the app still works while offline. */}
      {(offline || reconnecting) && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium text-white"
          style={{
            background: offline ? "#b45309" : "#0d9488",
            paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))",
          }}
        >
          {offline ? <WifiOff size={13} /> : <Wifi size={13} className="animate-pulse" />}
          {offline ? t("pwa.offlineBanner") : t("pwa.reconnecting")}
        </div>
      )}

      {/* Update available */}
      {updateReady && (
        <div
          role="status"
          className="animate-fade-up fixed bottom-4 left-4 z-[70] w-[min(320px,calc(100vw-2rem))] rounded-xl border border-cream-200 bg-[var(--color-surface)] p-3.5 shadow-2xl dark:border-gray-800"
          style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <p className="text-sm font-medium text-ink-900 dark:text-white">{t("pwa.updateTitle")}</p>
          <p className="mt-1 text-xs text-ink-600 dark:text-gray-400">{t("pwa.updateBody")}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={applyUpdate} className="btn-accent flex-1 text-xs">
              <RefreshCw size={12} /> {t("pwa.updateAction")}
            </button>
            <button
              onClick={() => setUpdateReady(false)}
              className="btn-ghost border border-cream-300 text-xs dark:border-gray-700"
            >
              {t("pwa.later")}
            </button>
          </div>
        </div>
      )}

      {/* Install prompt */}
      {showInstall && (
        <div
          role="dialog"
          aria-label={t("pwa.installTitle")}
          className="animate-fade-up fixed bottom-4 left-4 z-[70] w-[min(340px,calc(100vw-2rem))] rounded-xl border border-cream-200 bg-[var(--color-surface)] p-4 shadow-2xl dark:border-gray-800"
          style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-sm font-semibold text-ink-900 dark:text-white">
              {t("pwa.installTitle")}
            </p>
            <button
              onClick={dismissInstall}
              aria-label={t("pwa.notNow")}
              className="rounded p-0.5 text-ink-400 hover:bg-cream-200 dark:hover:bg-gray-800"
            >
              <X size={14} />
            </button>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-600 dark:text-gray-400">
            {t("pwa.installBody")}
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={install} className="btn-accent flex-1 text-xs">
              <Download size={12} /> {t("pwa.install")}
            </button>
            <button
              onClick={dismissInstall}
              className="btn-ghost border border-cream-300 text-xs dark:border-gray-700"
            >
              {t("pwa.notNow")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
