"use client";

/**
 * Bottom navigation, mobile only.
 *
 * The sidebar carries up to 16 destinations for a student. That's right for a
 * desktop rail and wrong for a thumb, so this exposes only the handful of
 * genuinely high-frequency destinations and leaves everything else in the
 * existing drawer — reached by "More", which opens the same sidebar rather than
 * introducing a second, competing navigation model.
 *
 * Five slots is the ceiling: past that, labels truncate and targets drop below
 * the 44px minimum on a 360px phone.
 *
 * Deliberately not rendered on the marketing pages — a bottom bar on a landing
 * page is app chrome pretending to be a website.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Bot, Route, MessageSquare, Menu,
  Briefcase, Users, Calendar, type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/i18n/hooks/useTranslation";

type Role = "student" | "mentor" | "employer" | "admin" | null;

type Item = { href: string; icon: LucideIcon; label: string };

export function MobileBottomNav({ onOpenMore }: { onOpenMore: () => void }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [role, setRole] = useState<Role>(null);
  const [hidden, setHidden] = useState(false);

  // Read after mount: localStorage doesn't exist during SSR, and reading it in
  // render would be a hydration mismatch (see Navbar).
  useEffect(() => {
    try { setRole(localStorage.getItem("user-role") as Role); } catch { setRole(null); }
  }, []);

  // The on-screen keyboard eats the viewport and would push this bar over the
  // input the user is typing into. Same two signals the Atlas dock uses:
  // focus, plus the visual viewport actually shrinking.
  useEffect(() => {
    const isTyping = (el: Element | null) =>
      !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable);
    const keyboardOpen = () => {
      const vv = window.visualViewport;
      return !!vv && vv.height < window.innerHeight * 0.75;
    };
    const check = () => setHidden(isTyping(document.activeElement) || keyboardOpen());
    document.addEventListener("focusin", check);
    document.addEventListener("focusout", check);
    window.visualViewport?.addEventListener("resize", check);
    check();
    return () => {
      document.removeEventListener("focusin", check);
      document.removeEventListener("focusout", check);
      window.visualViewport?.removeEventListener("resize", check);
    };
  }, []);

  const items: Item[] =
    role === "mentor"
      ? [
          { href: "/dashboard/mentor", icon: LayoutDashboard, label: t("nav.dashboard") },
          { href: "/dashboard/mentor", icon: Calendar, label: t("nav.mySessions") },
          { href: "/messages", icon: MessageSquare, label: t("nav.messages") },
          { href: "/community", icon: Users, label: t("nav.community") },
        ]
      : role === "employer"
        ? [
            { href: "/dashboard/employer", icon: LayoutDashboard, label: t("nav.dashboard") },
            { href: "/jobs", icon: Briefcase, label: t("nav.jobs") },
            { href: "/messages", icon: MessageSquare, label: t("nav.messages") },
            { href: "/community", icon: Users, label: t("nav.candidates") },
          ]
        : [
            // Student: the four things they return to daily. Opportunities,
            // housing, jobs and the tool suite stay in the drawer — they're
            // browsed in sessions, not tapped between.
            { href: "/dashboard/student", icon: LayoutDashboard, label: t("nav.dashboard") },
            { href: "/assistant", icon: Bot, label: t("nav.aiAssistant") },
            { href: "/tools/visa-roadmap", icon: Route, label: t("nav.visaRoadmap") },
            { href: "/messages", icon: MessageSquare, label: t("nav.messages") },
          ];

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <nav
      aria-label={t("nav.primary")}
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-cream-200 bg-[var(--color-surface)]/95 backdrop-blur-md transition-transform duration-200 md:hidden dark:border-gray-800 ${
        hidden ? "translate-y-full" : "translate-y-0"
      }`}
      // Sits above the home indicator on notched devices rather than under it.
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="flex items-stretch justify-around">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.label} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium transition-colors ${
                  active ? "text-clay-500" : "text-ink-500 dark:text-gray-400"
                }`}
              >
                <item.icon size={20} strokeWidth={active ? 2.4 : 2} />
                {/* Labels stay visible: icon-only bars force users to guess,
                    and this app is used in a second language by most people. */}
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}

        <li className="flex-1">
          <button
            onClick={onOpenMore}
            aria-label={t("nav.more")}
            className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium text-ink-500 transition-colors dark:text-gray-400"
          >
            <Menu size={20} />
            <span>{t("nav.more")}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
