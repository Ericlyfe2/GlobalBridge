"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Bot,
  Home,
  Users,
  Briefcase,
  Award,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  LifeBuoy,
  FileCheck,
  Sparkles,
  ClipboardList,
  Calendar,
  ArrowRightLeft,
  ShieldAlert,
  Route,
  Gauge,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import dynamic from "next/dynamic";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AuthGuard } from "@/components/AuthGuard";
import { SkipLink } from "@/components/SkipLink";
import { useTranslation } from "@/i18n/hooks/useTranslation";

const CommandPalette = dynamic(() => import("@/components/CommandPalette").then((m) => m.CommandPalette), { ssr: false });
const CommandTrigger = dynamic(() => import("@/components/CommandPalette").then((m) => m.CommandTrigger), { ssr: false });
const MobileSidebar = dynamic(() => import("@/components/MobileSidebar").then((m) => m.MobileSidebar), { ssr: false });

type Role = "student" | "mentor" | "employer" | "admin" | null;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);

  useEffect(() => {
    try { setRole(localStorage.getItem("user-role") as Role); } catch { setRole(null); }
  }, []);

  const navItems =
    role === "mentor"
      ? [
          { href: "/dashboard/mentor", icon: LayoutDashboard, label: t("nav.dashboard") },
          { href: "/dashboard/mentor", icon: Calendar, label: t("nav.mySessions") },
          { href: "/messages", icon: MessageSquare, label: t("nav.messages") },
          { href: "/community", icon: Users, label: t("nav.community") },
          { href: "/notifications", icon: Bell, label: t("nav.notifications") },
          { href: "/toolkit", icon: LifeBuoy, label: t("nav.toolkit") },
          { href: "/assistant", icon: Bot, label: t("nav.aiAssistant") },
        ]
      : role === "employer"
        ? [
            { href: "/dashboard/employer", icon: LayoutDashboard, label: t("nav.dashboard") },
            { href: "/jobs", icon: Briefcase, label: t("nav.myPostings") },
            { href: "/community", icon: Users, label: t("nav.candidates") },
            { href: "/messages", icon: MessageSquare, label: t("nav.messages") },
            { href: "/notifications", icon: Bell, label: t("nav.notifications") },
            { href: "/assistant", icon: Bot, label: t("nav.aiAssistant") },
          ]
        : [
            { href: "/dashboard/student", icon: LayoutDashboard, label: t("nav.dashboard") },
            { href: "/assistant", icon: Bot, label: t("nav.aiAssistant") },
            { href: "/opportunities", icon: Award, label: t("nav.opportunities") },
            { href: "/housing", icon: Home, label: t("nav.housing") },
            { href: "/community", icon: Users, label: t("nav.community") },
            { href: "/jobs", icon: Briefcase, label: t("nav.jobs") },
            { href: "/messages", icon: MessageSquare, label: t("nav.messages") },
            { href: "/notifications", icon: Bell, label: t("nav.notifications") },
            { href: "/toolkit", icon: LifeBuoy, label: t("nav.toolkit") },
            { href: "/tools/scam-shield", icon: ShieldAlert, label: "Scam Shield" },
            { href: "/tools/visa-roadmap", icon: Route, label: "Visa Roadmap" },
            { href: "/tools/readiness", icon: Gauge, label: "Readiness Score" },
            { href: "/tools/doc-checker", icon: FileCheck, label: t("nav.docChecker") },
            { href: "/tools/scholarship-matcher", icon: Sparkles, label: t("nav.scholarshipMatch") },
            { href: "/tools/timeline", icon: ClipboardList, label: t("nav.timelinePlanner") },
            { href: "/tools/country-compare", icon: ArrowRightLeft, label: t("nav.countryCompare") },
          ];

  function signOut() {
    try {
      ["gb-token", "gb-user", "user-name", "user-email", "user-initials", "user-role", "user-country", "onboarded"].forEach(
        (k) => localStorage.removeItem(k),
      );
    } catch { /* ignore */ }
    router.push("/");
  }

  return (
    <AuthGuard>
    <SkipLink />
    <div className="min-h-screen flex bg-cream-50">
      <CommandPalette />
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-cream-200 bg-cream-100">
        <div className="px-5 py-5 border-b border-cream-200">
          <Link href="/"><Logo /></Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.label}
                href={n.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                  active
                    ? "bg-clay-500/12 text-clay-600 font-medium"
                    : "text-ink-700 hover:bg-cream-200"
                }`}
              >
                <n.icon size={16} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-cream-200 p-3 space-y-1">
          <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink-700 hover:bg-cream-200 transition">
            <Settings size={16} /> {t("nav.settings")}
          </Link>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink-700 hover:bg-cream-200 transition">
            <LogOut size={16} /> {t("nav.signOut")}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-cream-200 bg-cream-50 px-4 md:px-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MobileSidebar preset="app" />
            <CommandTrigger />
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link href="/notifications" aria-label="Notifications" className="relative p-2 rounded-md hover:bg-cream-200">
              <Bell size={16} />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            </Link>
            <UserMenu />
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
    </AuthGuard>
  );
}
