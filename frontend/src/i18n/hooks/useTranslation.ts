"use client";

import { useCallback, useContext } from "react";
import { LocaleContext } from "../provider";
import type { Lang } from "../config";

type TranslationParams = Record<string, string | number>;

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = params[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

function resolveKey(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : path;
}

export function useTranslation() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useTranslation must be used within a LocaleProvider");

  const t = useCallback(
    (key: string, params?: TranslationParams): string => {
      const template = resolveKey(ctx.translations, key);
      return interpolate(template, params);
    },
    [ctx.translations]
  );

  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
      const d = date instanceof Date ? date : new Date(date);
      try {
        return new Intl.DateTimeFormat(ctx.lang, options).format(d);
      } catch {
        return d.toLocaleDateString();
      }
    },
    [ctx.lang]
  );

  const formatNumber = useCallback(
    (num: number, options?: Intl.NumberFormatOptions): string => {
      try {
        return new Intl.NumberFormat(ctx.lang, options).format(num);
      } catch {
        return num.toLocaleString();
      }
    },
    [ctx.lang]
  );

  const formatCurrency = useCallback(
    (amount: number, currency = "USD"): string => {
      try {
        return new Intl.NumberFormat(ctx.lang, {
          style: "currency",
          currency,
        }).format(amount);
      } catch {
        return `${currency} ${amount.toFixed(2)}`;
      }
    },
    [ctx.lang]
  );

  const formatRelativeTime = useCallback(
    (date: Date | string | number): string => {
      const d = date instanceof Date ? date : new Date(date);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return t("common.justNow");
      if (diffMin < 60) return t("common.ago", { time: t("common.minutes", { count: diffMin }) });
      if (diffHour < 24) return t("common.ago", { time: t("common.hours", { count: diffHour }) });
      if (diffDay < 7) return t("common.ago", { time: t("common.days", { count: diffDay }) });
      return formatDate(d, { month: "short", day: "numeric" });
    },
    [t, formatDate]
  );

  return {
    t,
    lang: ctx.lang,
    setLang: ctx.setLang,
    dir: ctx.dir,
    isRTL: ctx.dir === "rtl",
    translating: ctx.translating,
    formatDate,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    availableLanguages: ctx.availableLanguages,
  };
}
