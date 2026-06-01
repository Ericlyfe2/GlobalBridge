"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserMenu } from "./UserMenu";
import { getToken } from "@/lib/auth";

const guestLinks = [
  { href: "/auth?mode=signup", label: "Opportunities", id: "opportunities" },
  { href: "/auth?mode=signup", label: "Housing", id: "housing" },
  { href: "/auth?mode=signup", label: "Community", id: "community" },
  { href: "/auth?mode=signup", label: "Jobs", id: "jobs" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [authed] = useState(() => !!getToken());

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-cream-50/80 border-b border-cream-200">
      <nav className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {(authed ? [
            { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
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
              <Link href="/auth?mode=signin" className="btn-ghost text-sm">Sign in</Link>
              <Link href="/auth?mode=signup" className="btn-accent text-sm">Get started</Link>
            </>
          )}
        </div>

        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          <button
            className="p-2 rounded-md hover:bg-cream-200"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden border-t border-cream-200 px-6 py-4 space-y-2 bg-cream-50">
          {(authed ? [
            { href: "/dashboard", label: "Dashboard", id: "dashboard" },
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
              <Link href="/" className="btn-ghost text-sm">Home</Link>
            ) : (
              <>
                <Link href="/auth?mode=signin" className="btn-ghost text-sm" onClick={() => setOpen(false)}>Sign in</Link>
                <Link href="/auth?mode=signup" className="btn-accent text-sm" onClick={() => setOpen(false)}>Get started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
