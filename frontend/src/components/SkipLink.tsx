"use client";

import { useTranslation } from "@/i18n/hooks/useTranslation";

/**
 * Keyboard-only "skip to content" link. Off-screen until focused (see the
 * .skip-link rule in globals.css). Must be the first focusable element in a
 * layout, and the layout's <main> must carry id="main-content".
 */
export function SkipLink() {
  const { t } = useTranslation();
  return (
    <a href="#main-content" className="skip-link">
      {t("common.skipToContent")}
    </a>
  );
}
