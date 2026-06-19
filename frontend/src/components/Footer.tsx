"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { useTranslation } from "@/i18n/hooks/useTranslation";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-cream-200 bg-cream-100 mt-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 text-sm text-ink-600 max-w-xs">
              {t("footer.description")}
            </p>
            <p className="mt-6 text-xs text-ink-500">{t("footer.copyright")}</p>
          </div>

          <FooterCol title={t("footer.platform")} items={[
            { href: "/opportunities", label: t("nav.opportunities") },
            { href: "/housing", label: t("nav.housing") },
            { href: "/jobs", label: t("nav.jobs") },
            { href: "/assistant", label: t("nav.aiAssistant") },
            { href: "/pricing", label: t("footer.pricing") },
          ]} />

          <FooterCol title={t("footer.community")} items={[
            { href: "/community", label: t("footer.mentors") },
            { href: "/forums", label: t("footer.forums") },
            { href: "/stories", label: t("footer.successStories") },
            { href: "/scam-alerts", label: t("footer.scamAlerts") },
          ]} />

          <FooterCol title={t("footer.resources")} items={[
            { href: "/toolkit/cost", label: t("footer.costCalculator") },
            { href: "/toolkit/banking", label: t("footer.bankingGuide") },
            { href: "/toolkit/healthcare", label: t("footer.healthcare") },
            { href: "/toolkit/sos", label: t("footer.emergencySOS") },
          ]} />

          <FooterCol title={t("footer.company")} items={[
            { href: "/about", label: t("common.about") },
            { href: "/help", label: t("common.help") },
            { href: "/contact", label: t("common.contact") },
            { href: "/privacy", label: t("common.privacy") },
            { href: "/terms", label: t("common.terms") },
          ]} />
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 className="font-display text-sm font-semibold text-ink-900 mb-3">{title}</h4>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="text-sm text-ink-600 hover:text-clay-600 transition">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
