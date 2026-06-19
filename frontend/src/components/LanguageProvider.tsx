"use client";

export { LocaleProvider as LanguageProvider } from "@/i18n/provider";
export { useTranslation as useLanguage } from "@/i18n/hooks/useTranslation";
export { SUPPORTED_LANGUAGES as LANGS, type Lang } from "@/i18n/config";
