"use client";

import { useCallback, useContext } from "react";
import { LocaleContext } from "../provider";
import { SUPPORTED_LANGUAGES, type Lang } from "../config";

type TranslationParams = Record<string, string | number>;

type PluralForms = {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};

function isPluralForms(v: unknown): v is PluralForms {
  return typeof v === "object" && v !== null && "other" in v;
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = params[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

function resolveValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function selectPluralForm(lang: Lang, count: number, forms: PluralForms): string {
  if (count === 0 && forms.zero) return forms.zero;
  try {
    const rules = new Intl.PluralRules(lang);
    const form = rules.select(count) as keyof PluralForms;
    return forms[form] || forms.other;
  } catch {
    return forms.other;
  }
}

const localeCache = new Map<Lang, Intl.RelativeTimeFormat>();

function getRelativeFormatter(lang: Lang): Intl.RelativeTimeFormat {
  let f = localeCache.get(lang);
  if (!f) {
    try {
      f = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
    } catch {
      f = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    }
    localeCache.set(lang, f);
  }
  return f;
}

import enDict from "../locales/en.json";

export function useTranslation() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useTranslation must be used within a LocaleProvider");

  const t = useCallback(
    (key: string, params?: TranslationParams): string => {
      let value = resolveValue(ctx.translations, key);

      // Auto-generated placeholders like "[DE] Some text" are not real
      // translations — treat them as missing so we fall back to English
      // instead of rendering the broken "[DE] ..." string to the user.
      const isPlaceholder =
        typeof value === "string" && /^\[[A-Za-z]{2}\]\s?/.test(value);

      if (value === undefined || isPlaceholder) {
        value = resolveValue(enDict as Record<string, unknown>, key);
      }

      if (value === undefined) return key;

      if (isPluralForms(value) && params?.count !== undefined) {
        const form = selectPluralForm(ctx.lang, Number(params.count), value);
        return interpolate(form, params);
      }

      if (typeof value === "string") {
        return interpolate(value, params);
      }

      return key;
    },
    [ctx.translations, ctx.lang]
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
      const absDiffSec = Math.floor(Math.abs(diffMs) / 1000);

      const units: [number, Intl.RelativeTimeFormatUnit][] = [
        [absDiffSec, "second"],
        [Math.floor(absDiffSec / 60), "minute"],
        [Math.floor(absDiffSec / 3600), "hour"],
        [Math.floor(absDiffSec / 86400), "day"],
        [Math.floor(absDiffSec / 604800), "week"],
        [Math.floor(absDiffSec / 2592000), "month"],
        [Math.floor(absDiffSec / 31536000), "year"],
      ];

      for (const [value, unit] of units) {
        if (value < 2 && unit !== "second") continue;
        const formatter = getRelativeFormatter(ctx.lang);
        const result = formatter.format(-value, unit);
        if (result !== String(-value)) return result;
      }

      try {
        return new Intl.DateTimeFormat(ctx.lang, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(d);
      } catch {
        return d.toLocaleDateString();
      }
    },
    [ctx.lang]
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
