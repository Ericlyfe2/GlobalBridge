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
import { authFetch, getToken } from "@/lib/auth";

const CommandPalette = dynamic(() => import("@/components/CommandPalette").then((m) => m.CommandPalette), { ssr: false });
const CommandTrigger = dynamic(() => import("@/components/CommandPalette").then((m) => m.CommandTrigger), { ssr: false });
const MobileSidebar = dynamic(() => import("@/components/MobileSidebar").then((m) => m.MobileSidebar), { ssr: false });
const MobileBottomNav = dynamic(() => import("@/components/MobileBottomNav").then((m) => m.MobileBottomNav), { ssr: false });
const AtlasStage = dynamic(() => import("@/components/mascot/AtlasStage").then((m) => m.AtlasStage), { ssr: false });

type Role = "student" | "mentor" | "employer" | "admin" | null;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  // Lifted so the bottom bar's "More" and the header button open the same drawer.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    try { setRole(localStorage.getItem("user-role") as Role); } catch { setRole(null); }
  }, []);

  // The bell's red dot used to be a static element with no data behind it —
  // always on, for every user, regardless of whether they had anything
  // unread. Refetch on mount, on tab focus, and whenever the route changes
  // (covers navigating away from /notifications after reading things there).
  useEffect(() => {
    if (!getToken()) { setHasUnread(false); return; }
    let cancelled = false;
    async function checkUnread() {
      try {
        const res = await authFetch("/api/content/notifications/unread-count");
        const data = await res.json();
        if (!cancelled) setHasUnread(res.ok && (data?.count ?? 0) > 0);
      } catch { /* leave last known state */ }
    }
    checkUnread();
    window.addEventListener("focus", checkUnread);
    return () => { cancelled = true; window.removeEventListener("focus", checkUnread); };
  }, [pathname]);

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
            <MobileSidebar preset="app" open={drawerOpen} onOpenChange={setDrawerOpen} />
            <CommandTrigger />
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link href="/notifications" aria-label="Notifications" className="relative p-2 rounded-md hover:bg-cream-200">
              <Bell size={16} />
              {hasUnread && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />}
            </Link>
            <UserMenu />
          </div>
        </header>

        {/* pb-20 on mobile clears the fixed bottom bar so the last item in any
            list stays reachable; md:pb-0 restores desktop spacing. */}
        <main id="main-content" className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>
      </div>

      {/* Mobile-only bottom bar. "More" opens the same drawer as the header. */}
      <MobileBottomNav onOpenMore={() => setDrawerOpen(true)} />

      {/* Atlas rides along the whole signed-in app; individual pages just
          raise events and the engine decides whether he speaks.
          --gb-dock-offset lifts him above the bottom bar on mobile so the two
          don't overlap; AtlasStage adds it to its own bottom inset. */}
      <div className="contents [--gb-dock-offset:4rem] md:[--gb-dock-offset:0px]">
        <AtlasStage variant="dock" />
      </div>
    </div>
    </AuthGuard>
  );
}
