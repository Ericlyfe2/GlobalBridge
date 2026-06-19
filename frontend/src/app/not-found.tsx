"use client";

import Link from "next/link";
import { Compass, Home, Search } from "lucide-react";
import { useTranslation } from "@/i18n/hooks/useTranslation";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-cream-50 dark:bg-gray-950">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-clay-500/15 text-clay-600 flex items-center justify-center mb-6">
          <Compass size={28} />
        </div>

        <p className="text-xs uppercase tracking-wider text-clay-600 mb-2">{t("notFound.errorCode")}</p>
        <h1 className="text-3xl md:text-4xl font-display font-semibold text-ink-900 dark:text-white">
          {t("notFound.title")}
        </h1>
        <p className="text-sm text-ink-600 dark:text-gray-400 mt-3 leading-relaxed">
          {t("notFound.description")}
        </p>

        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Link href="/" className="btn-accent text-sm inline-flex items-center gap-1.5">
            <Home size={14} /> {t("common.home")}
          </Link>
          <Link href="/dashboard" className="btn-ghost border border-cream-300 dark:border-gray-700 text-sm">
            {t("common.dashboard")}
          </Link>
          <Link href="/assistant" className="btn-ghost border border-cream-300 dark:border-gray-700 text-sm inline-flex items-center gap-1.5">
            <Search size={14} /> {t("common.askAi")}
          </Link>
        </div>

        <p className="mt-10 text-xs text-ink-500 dark:text-gray-500">
          {t("common.search")}{" "}
          <kbd className="px-1.5 py-0.5 border border-cream-300 dark:border-gray-700 rounded text-[10px]">⌘K</kbd> /{" "}
          <kbd className="px-1.5 py-0.5 border border-cream-300 dark:border-gray-700 rounded text-[10px]">Ctrl K</kbd>
        </p>
      </div>
    </div>
  );
}
