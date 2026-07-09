"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserMenu } from "./UserMenu";
import { getToken } from "@/lib/auth";
import { useTranslation } from "@/i18n/hooks/useTranslation";

const guestLinksFn = (t: (key: string) => string) => [
  { href: "/auth?mode=signup", label: t("nav.opportunities"), id: "opportunities" },
  { href: "/auth?mode=signup", label: t("nav.housing"), id: "housing" },
  { href: "/auth?mode=signup", label: t("nav.community"), id: "community" },
  { href: "/auth?mode=signup", label: t("nav.jobs"), id: "jobs" },
];

export function Navbar() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [authed] = useState(() => !!getToken());

  const guestLinks = guestLinksFn(t);

  // Close the mobile menu on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 isolate overflow-hidden backdrop-blur-md bg-cream-50/80 border-b border-cream-200">
      {/* Background video — aerial Bangkok at sunset */}
      <video
        aria-hidden
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="animate-ken-burns pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover"
      >
        <source src="/video/bangkok.mp4" type="video/mp4" />
      </video>
      {/* Theme-aware scrim keeps the nav legible over the video */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-cream-50/75" />

      <nav className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {(authed ? [
            { href: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard"), id: "dashboard" },
            ...guestLinks,
          ] : guestLinks).map((l) => (
            <Link
              key={l.id || l.href}
              href={l.href}
              className="px-3 py-1.5 rounded-md text-sm font-medium text-ink-700 hover:bg-cream-200 transition"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          {authed ? (
            <UserMenu />
          ) : (
            <>
              <Link href="/auth?mode=signin" className="btn-ghost text-sm">{t("nav.signIn")}</Link>
              <Link href="/auth?mode=signup" className="btn-accent text-sm">{t("nav.getStarted")}</Link>
            </>
          )}
        </div>

        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          <button
            className="p-2 rounded-md hover:bg-cream-200"
            onClick={() => setOpen(!open)}
            aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-nav" className="md:hidden border-t border-cream-200 px-6 py-4 space-y-2 bg-cream-50">
          {(authed ? [
            { href: "/dashboard", label: t("nav.dashboard"), id: "dashboard" },
            ...guestLinks,
          ] : guestLinks).map((l) => (
            <Link
              key={l.id || l.href}
              href={l.href}
              className="block px-3 py-2 rounded-md text-sm font-medium text-ink-700 hover:bg-cream-200"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 pt-2 pb-2">
            <LanguageSwitcher />
          </div>
          <div className="pt-2 border-t border-cream-200 flex flex-col gap-2">
            {authed ? (
              <Link href="/" className="btn-ghost text-sm">{t("nav.home")}</Link>
            ) : (
              <>
                <Link href="/auth?mode=signin" className="btn-ghost text-sm" onClick={() => setOpen(false)}>{t("nav.signIn")}</Link>
                <Link href="/auth?mode=signup" className="btn-accent text-sm" onClick={() => setOpen(false)}>{t("nav.getStarted")}</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
