"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, ShieldCheck, Flag, FileText, Bot, ScrollText,
  ArrowLeft, Bell, Settings, BarChart3, Building2, Search,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CommandPalette } from "@/components/CommandPalette";
import { MobileSidebar } from "@/components/MobileSidebar";
import { AdminGuard } from "@/components/AdminGuard";
import { SkipLink } from "@/components/SkipLink";
import { getUser } from "@/lib/auth";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { sora, jetbrainsMono } from "./fonts";

const navItemsFn = (t: (key: string) => string) => [
  { section: "Overview", href: "/admin", icon: LayoutDashboard, label: t("nav.overview") },
  { section: "Overview", href: "/admin/users", icon: Users, label: t("nav.users") },
  { section: "Overview", href: "/admin/mentor-verifications", icon: ShieldCheck, label: "Mentor Verifications" },
  { section: "Overview", href: "/admin/employer-verifications", icon: Building2, label: "Employer Verifications" },
  { section: "Overview", href: "/admin/content", icon: FileText, label: "Content Moderation" },
  { section: "Overview", href: "/admin/reports", icon: Flag, label: t("nav.reports") },
  { section: "Intelligence", href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { section: "Intelligence", href: "/admin/ai", icon: Bot, label: "AI Control Center" },
  { section: "Intelligence", href: "/admin/notifications", icon: Bell, label: "Notifications" },
  { section: "Intelligence", href: "/admin/settings", icon: Settings, label: "Settings" },
  { section: "Intelligence", href: "/admin/audit", icon: ScrollText, label: t("nav.auditLog") },
];

const CRUMB_LABELS: Record<string, string> = {
  admin: "admin", users: "users", "mentor-verifications": "mentor-verifications",
  "employer-verifications": "employer-verifications", content: "content", reports: "reports",
  analytics: "analytics", ai: "ai · control-center", notifications: "notifications",
  settings: "settings", audit: "audit-log",
};

function openCommandPalette() {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
}

function useAdminIdentity() {
  const [identity, setIdentity] = useState<{ initials: string; name: string; role: string } | null>(null);
  useEffect(() => {
    const u = getUser();
    if (!u) return;
    const initials = u.full_name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
    setIdentity({ initials, name: u.full_name, role: u.role });
  }, []);
  return identity;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const identity = useAdminIdentity();
  const items = navItemsFn(t);
  const segments = pathname.split("/").filter(Boolean).slice(0, 2);

  return (
    <AdminGuard>
      <SkipLink />
      <div className={`${sora.variable} ${jetbrainsMono.variable} dark relative min-h-screen bg-[#05070d] text-[#e6ecff]`}>
        {/* decorative background */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(120,140,200,.06) 1px,transparent 1px), linear-gradient(90deg,rgba(120,140,200,.06) 1px,transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 30%, black 40%, transparent 100%)",
          }}
        />
        <div aria-hidden className="pointer-events-none fixed -left-32 -top-36 z-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,#4d8bff,transparent_65%)] opacity-40 blur-[80px]" />
        <div aria-hidden className="pointer-events-none fixed -right-36 top-1/3 z-0 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,#8b6bff,transparent_65%)] opacity-40 blur-[80px]" />

        <CommandPalette />

        <div className="relative z-10 flex min-h-screen font-sans" style={{ fontFamily: "var(--font-sans)" }}>
          {/* SIDEBAR */}
          <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col gap-[18px] border-r border-white/10 bg-gradient-to-b from-[#0a0f1e]/85 to-[#0a0f1e]/50 p-[22px_16px] backdrop-blur-xl md:flex">
            <Link href="/" className="flex items-center gap-2.5 border-b border-white/10 px-2 pb-3.5">
              <span className="relative grid h-[34px] w-[34px] shrink-0 place-items-center overflow-hidden rounded-[9px] bg-[conic-gradient(from_180deg,#4d8bff,#8b6bff,#3ee6ff,#4d8bff)] shadow-[0_0_22px_rgba(77,139,255,.55)]">
                <span className="absolute inset-[2px] rounded-[7px] bg-[radial-gradient(circle_at_30%_30%,#0a0f1e,#05070d)]" />
              </span>
              <span className={`${sora.className} text-[15px] font-bold tracking-tight text-white`}>
                GlobalBridge
                <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[.18em] text-slate-500">Admin Console</span>
              </span>
            </Link>

            <nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
              {(["Overview", "Intelligence"] as const).map((section) => (
                <div key={section}>
                  <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[.22em] text-slate-500">{section}</div>
                  <div className="flex flex-col gap-0.5">
                    {items.filter((n) => n.section === section).map((n) => {
                      const isActive = pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href));
                      return (
                        <Link
                          key={n.href}
                          href={n.href}
                          className={`relative flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-[13px] font-medium transition ${
                            isActive
                              ? "bg-gradient-to-r from-[#4d8bff]/18 to-[#8b6bff]/8 text-white shadow-[inset_0_0_0_1px_rgba(120,180,255,.25)]"
                              : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                          }`}
                        >
                          {isActive && (
                            <span className="absolute -left-4 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-[#3ee6ff] to-[#8b6bff] shadow-[0_0_12px_#4d8bff]" />
                          )}
                          <n.icon size={16} className="opacity-85" />
                          {n.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="mt-auto flex items-center gap-2.5 border-t border-white/10 pt-3.5">
              <span className="relative grid h-[34px] w-[34px] place-items-center rounded-full bg-gradient-to-br from-[#4d8bff] to-[#8b6bff] text-xs font-semibold text-white">
                {identity?.initials ?? "?"}
                <span className="absolute -bottom-px -right-px h-[9px] w-[9px] rounded-full border-2 border-[#0a0f1e] bg-[#39e8a5] shadow-[0_0_8px_#39e8a5]" />
              </span>
              <div className="min-w-0 text-xs">
                <b className="block truncate font-semibold text-white">{identity?.name ?? "Admin"}</b>
                <span className="text-slate-500">{identity?.role ?? ""}</span>
              </div>
            </div>

            <Link href="/dashboard" className="flex items-center gap-3 rounded-[9px] px-3 py-2 text-[13px] text-slate-400 transition hover:bg-white/[0.06] hover:text-white">
              <ArrowLeft size={16} /> {t("nav.backToApp")}
            </Link>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* TOPBAR */}
            <div className="sticky top-0 z-20 flex items-center gap-3.5 border-b border-white/10 bg-black/60 px-4 py-3 backdrop-blur-xl md:px-6.5">
              <MobileSidebar preset="admin" />
              <div
                className="hidden items-center gap-2 text-xs tracking-wide text-slate-500 sm:flex"
                style={{ fontFamily: "var(--font-jetbrains)" }}
              >
                {segments.map((seg, i) => (
                  <span key={seg} className="flex items-center gap-2">
                    {i > 0 && <span className="h-1 w-1 rounded-full bg-slate-600" />}
                    {i === segments.length - 1
                      ? <b className="font-semibold text-white">{CRUMB_LABELS[seg] ?? seg}</b>
                      : <span>/{seg}</span>}
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={openCommandPalette}
                className="relative ml-auto flex h-[38px] w-full max-w-[420px] items-center gap-2 rounded-[10px] border border-white/10 bg-black/30 px-3.5 text-left text-[13px] text-slate-500 transition hover:border-[rgba(120,180,255,.35)]"
              >
                <Search size={15} className="shrink-0 text-slate-500" />
                <span className="flex-1 truncate">Search conversations, prompts, users, features…</span>
                <kbd className="rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] text-slate-500" style={{ fontFamily: "var(--font-jetbrains)" }}>⌘K</kbd>
              </button>

              <span
                className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-red-400/35 bg-gradient-to-r from-red-400/20 to-red-400/5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-red-300 sm:inline-flex"
                style={{ fontFamily: "var(--font-jetbrains)" }}
              >
                {identity?.role === "super_admin" ? "Super Admin" : "Admin"}
              </span>

              <Link href="/admin/notifications" className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] border border-white/10 bg-black/30 text-slate-400 transition hover:border-[rgba(120,180,255,.35)] hover:text-white">
                <Bell size={16} />
              </Link>
              <Link href="/admin/settings" className="hidden h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] border border-white/10 bg-black/30 text-slate-400 transition hover:border-[rgba(120,180,255,.35)] hover:text-white sm:grid">
                <Settings size={16} />
              </Link>
              <LanguageSwitcher />
              <UserMenu />
            </div>

            <main id="main-content" className="flex-1 overflow-auto">{children}</main>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
