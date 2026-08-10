"use client";

/**
 * Opt-in control for browser notifications.
 *
 * This is the ONLY place permission is ever requested, and only from a click.
 * The user has to reach Settings and deliberately turn it on, which is the
 * contextual-consent model: ask when the person has shown intent, never on load.
 *
 * Every unavailable state renders an explanation rather than a broken switch,
 * because "nothing happens when I tap this" is worse than "here's why".
 */

import { Bell, BellOff, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { usePushNotifications } from "@/lib/pwa/usePushNotifications";

export function NotificationToggle() {
  const { t } = useTranslation();
  const { state, busy, subscribe, unsubscribe } = usePushNotifications();

  // Nothing to offer — say so plainly instead of showing a dead toggle.
  if (state === "unsupported" || state === "unconfigured") {
    return (
      <div className="rounded-xl border border-cream-200 p-4 dark:border-gray-800">
        <p className="flex items-center gap-2 text-sm font-medium text-ink-900 dark:text-white">
          <BellOff size={15} /> {t("pwa.pushTitle")}
        </p>
        <p className="mt-1.5 text-xs text-ink-500 dark:text-gray-400">
          {t("pwa.pushUnsupported")}
        </p>
      </div>
    );
  }

  // Denied is terminal: the browser will not re-prompt, so pointing at settings
  // is the only honest advice we can give.
  if (state === "denied") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
        <p className="flex items-center gap-2 text-sm font-medium text-ink-900 dark:text-white">
          <BellOff size={15} /> {t("pwa.pushBlockedTitle")}
        </p>
        <p className="mt-1.5 text-xs text-ink-600 dark:text-gray-400">
          {t("pwa.pushBlockedBody")}
        </p>
      </div>
    );
  }

  const on = state === "granted";

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-cream-200 p-4 dark:border-gray-800">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium text-ink-900 dark:text-white">
          <Bell size={15} /> {t("pwa.pushTitle")}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-600 dark:text-gray-400">
          {t("pwa.pushBody")}
        </p>
      </div>
      <button
        onClick={() => (on ? unsubscribe() : subscribe())}
        disabled={busy}
        role="switch"
        aria-checked={on}
        aria-label={t("pwa.pushTitle")}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
          on ? "bg-clay-500" : "bg-cream-300 dark:bg-gray-700"
        }`}
      >
        <span
          className={`absolute top-0.5 grid h-5 w-5 place-items-center rounded-full bg-white transition-transform ${
            on ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        >
          {busy && <Loader2 size={11} className="animate-spin text-ink-500" />}
        </span>
      </button>
    </div>
  );
}
