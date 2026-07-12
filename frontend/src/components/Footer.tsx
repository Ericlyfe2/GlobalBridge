"use client";

import Link from "next/link";
import { useTranslation } from "@/i18n/hooks/useTranslation";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-24 bg-neutral-950">
      {/* Image banner with blurred backdrop + bold wordmark */}
      <div className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center blur-sm"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1473773508845-188df298d2d1?q=80&w=2000&auto=format&fit=crop')",
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-neutral-950/60" aria-hidden="true" />

        <div className="relative px-6 pt-20 pb-16 lg:px-12 lg:pt-28 lg:pb-24">
          <h2 className="select-none font-display text-[16vw] leading-[0.85] font-black tracking-tight text-emerald-400 sm:text-[13vw] lg:text-[9rem]">
            GLOBAL
            <br />
            BRIDGE
          </h2>
        </div>
      </div>

      {/* Link columns */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
            <div className="col-span-2">
              <span className="font-display text-lg font-bold tracking-tight text-emerald-400">
                GLOBAL BRIDGE
              </span>
              <p className="mt-4 max-w-xs text-sm text-neutral-400">
                {t("footer.description")}
              </p>
              <p className="mt-6 text-xs text-neutral-500">{t("footer.copyright", { year: new Date().getFullYear() })}</p>
            </div>

            <FooterCol
              title={t("footer.platform")}
              items={[
                { href: "/opportunities", label: t("nav.opportunities") },
                { href: "/housing", label: t("nav.housing") },
                { href: "/jobs", label: t("nav.jobs") },
                { href: "/assistant", label: t("nav.aiAssistant") },
                { href: "/pricing", label: t("footer.pricing") },
              ]}
            />

            <FooterCol
              title={t("footer.community")}
              items={[
                { href: "/community", label: t("footer.mentors") },
                { href: "/forums", label: t("footer.forums") },
                { href: "/stories", label: t("footer.successStories") },
                { href: "/scam-alerts", label: t("footer.scamAlerts") },
              ]}
            />

            <FooterCol
              title={t("footer.resources")}
              items={[
                { href: "/toolkit/cost", label: t("footer.costCalculator") },
                { href: "/toolkit/banking", label: t("footer.bankingGuide") },
                { href: "/toolkit/healthcare", label: t("footer.healthcare") },
                { href: "/toolkit/sos", label: t("footer.emergencySOS") },
              ]}
            />

            <FooterCol
              title={t("footer.company")}
              items={[
                { href: "/about", label: t("common.about") },
                { href: "/help", label: t("common.help") },
                { href: "/contact", label: t("common.contact") },
                { href: "/privacy", label: t("common.privacy") },
                { href: "/terms", label: t("common.terms") },
              ]}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 className="mb-3 font-display text-sm font-semibold text-neutral-300">{title}</h4>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="text-sm text-neutral-400 transition hover:text-emerald-400">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}