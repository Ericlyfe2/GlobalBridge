"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, ShieldCheck, Flag, FileText, Bot, ScrollText,
  AlertOctagon, ArrowLeft, Bell, Settings, BarChart3, Briefcase, Building2, GraduationCap,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CommandPalette, CommandTrigger } from "@/components/CommandPalette";
import { MobileSidebar } from "@/components/MobileSidebar";
import { AdminGuard } from "@/components/AdminGuard";
import { SkipLink } from "@/components/SkipLink";
import { useTranslation } from "@/i18n/hooks/useTranslation";

const navItemsFn = (t: (key: string) => string) => [
  { href: "/admin", icon: LayoutDashboard, label: t("nav.overview") },
  { href: "/admin/users", icon: Users, label: t("nav.users") },
  { href: "/admin/mentor-verifications", icon: ShieldCheck, label: "Mentor Verifications" },
  { href: "/admin/employer-verifications", icon: Building2, label: "Employer Verifications" },
  { href: "/admin/content", icon: FileText, label: "Content Moderation" },
  { href: "/admin/reports", icon: Flag, label: t("nav.reports") },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/admin/notifications", icon: Bell, label: "Notifications" },
  { href: "/admin/ai", icon: Bot, label: t("nav.aiConfig") },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
  { href: "/admin/audit", icon: ScrollText, label: t("nav.auditLog") },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();

  return (
    <AdminGuard>
    <SkipLink />
    <div className="min-h-screen flex bg-cream-50">
      <CommandPalette />
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-cream-200 bg-cream-100">
        <div className="px-5 py-5 border-b border-cream-200 flex items-center justify-between">
          <Link href="/"><Logo /></Link>
        </div>

        <div className="px-5 py-3 border-b border-cream-200">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-600">
            <AlertOctagon size={11} /> {t("nav.adminConsole")}
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItemsFn(t).map((n) => {
            const isActive = pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                  isActive
                    ? "bg-clay-500/10 text-clay-700 font-medium"
                    : "text-ink-700 hover:bg-cream-200"
                }`}
              >
                <n.icon size={16} className={isActive ? "text-clay-600" : ""} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-cream-200 p-3 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink-700 hover:bg-cream-200 transition"
          >
            <ArrowLeft size={16} /> {t("nav.backToApp")}
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-cream-200 bg-cream-50 px-4 md:px-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MobileSidebar preset="admin" />
            <span className="badge !bg-red-500/15 !text-red-600 shrink-0">ADMIN</span>
            <span className="text-xs text-ink-500 hidden sm:inline">{t("admin.actionsAffectAll")}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <CommandTrigger />
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
    </AdminGuard>
  );
}
