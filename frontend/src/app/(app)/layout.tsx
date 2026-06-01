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
  Star,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import dynamic from "next/dynamic";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AuthGuard } from "@/components/AuthGuard";

const CommandPalette = dynamic(() => import("@/components/CommandPalette").then((m) => m.CommandPalette), { ssr: false });
const CommandTrigger = dynamic(() => import("@/components/CommandPalette").then((m) => m.CommandTrigger), { ssr: false });
const MobileSidebar = dynamic(() => import("@/components/MobileSidebar").then((m) => m.MobileSidebar), { ssr: false });

type Role = "student" | "mentor" | "employer" | "admin" | null;

const STUDENT_NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/assistant", icon: Bot, label: "AI Assistant" },
  { href: "/opportunities", icon: Award, label: "Opportunities" },
  { href: "/housing", icon: Home, label: "Housing" },
  { href: "/community", icon: Users, label: "Community" },
  { href: "/jobs", icon: Briefcase, label: "Jobs" },
  { href: "/messages", icon: MessageSquare, label: "Messages" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/toolkit", icon: LifeBuoy, label: "Toolkit" },
  { href: "/tools/doc-checker", icon: FileCheck, label: "Doc Checker" },
  { href: "/tools/scholarship-matcher", icon: Sparkles, label: "Scholarship Match" },
  { href: "/tools/timeline", icon: ClipboardList, label: "Timeline Planner" },
];

const MENTOR_NAV = [
  { href: "/dashboard/mentor", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/mentor", icon: Calendar, label: "My Sessions" },
  { href: "/messages", icon: MessageSquare, label: "Messages" },
  { href: "/community", icon: Users, label: "Community" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/toolkit", icon: LifeBuoy, label: "Toolkit" },
  { href: "/assistant", icon: Bot, label: "AI Assistant" },
];

const EMPLOYER_NAV = [
  { href: "/dashboard/employer", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/jobs", icon: Briefcase, label: "My Postings" },
  { href: "/community", icon: Users, label: "Candidates" },
  { href: "/messages", icon: MessageSquare, label: "Messages" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/assistant", icon: Bot, label: "AI Assistant" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role] = useState<Role>(() => {
    try { return localStorage.getItem("user-role") as Role; } catch { return null; }
  });

  const navItems = role === "mentor" ? MENTOR_NAV
    : role === "employer" ? EMPLOYER_NAV
    : STUDENT_NAV;

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
            <Settings size={16} /> Settings
          </Link>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink-700 hover:bg-cream-200 transition">
            <LogOut size={16} /> Sign out
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

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
    </AuthGuard>
  );
}
