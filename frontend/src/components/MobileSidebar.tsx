"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Menu, X,
  LayoutDashboard, Bot, Home, Users, Briefcase, Award, MessageSquare, Bell, LifeBuoy,
  ShieldCheck, Flag, FileText, AlertOctagon, FileCheck, Sparkles, ClipboardList,
  ShieldAlert, Route, Gauge,
} from "lucide-react";
import { Logo } from "./Logo";

export type SidebarPreset = "app" | "admin";

const ADMIN_NAV = [
  { href: "/admin",                label: "Overview",      Icon: LayoutDashboard },
  { href: "/admin/users",          label: "Users",         Icon: Users },
  { href: "/admin/verifications",  label: "Verifications", Icon: ShieldCheck },
  { href: "/admin/listings",       label: "Listings",      Icon: FileText },
  { href: "/admin/reports",        label: "Reports",       Icon: Flag },
  { href: "/admin/ai",             label: "AI Config",     Icon: Bot },
];

const STUDENT_NAV = [
  { href: "/dashboard",                  label: "Dashboard",         Icon: LayoutDashboard },
  { href: "/assistant",                  label: "AI Assistant",      Icon: Bot },
  { href: "/opportunities",              label: "Opportunities",     Icon: Award },
  { href: "/housing",                    label: "Housing",           Icon: Home },
  { href: "/community",                  label: "Community",         Icon: Users },
  { href: "/jobs",                       label: "Jobs",              Icon: Briefcase },
  { href: "/messages",                   label: "Messages",          Icon: MessageSquare },
  { href: "/notifications",              label: "Notifications",     Icon: Bell },
  { href: "/toolkit",                    label: "Toolkit",           Icon: LifeBuoy },
  { href: "/tools/scam-shield",          label: "Scam Shield",       Icon: ShieldAlert },
  { href: "/tools/visa-roadmap",         label: "Visa Roadmap",      Icon: Route },
  { href: "/tools/readiness",            label: "Readiness Score",   Icon: Gauge },
  { href: "/tools/doc-checker",          label: "Doc Checker",       Icon: FileCheck },
  { href: "/tools/scholarship-matcher",  label: "Scholarship Match", Icon: Sparkles },
  { href: "/tools/timeline",             label: "Timeline Planner",  Icon: ClipboardList },
];

const MENTOR_NAV = [
  { href: "/dashboard/mentor", label: "Dashboard",    Icon: LayoutDashboard },
  { href: "/messages",         label: "Messages",     Icon: MessageSquare },
  { href: "/community",        label: "Community",    Icon: Users },
  { href: "/notifications",    label: "Notifications",Icon: Bell },
  { href: "/toolkit",          label: "Toolkit",      Icon: LifeBuoy },
  { href: "/assistant",        label: "AI Assistant", Icon: Bot },
];

const EMPLOYER_NAV = [
  { href: "/dashboard/employer", label: "Dashboard",   Icon: LayoutDashboard },
  { href: "/jobs",               label: "My Postings", Icon: Briefcase },
  { href: "/community",          label: "Candidates",  Icon: Users },
  { href: "/messages",           label: "Messages",    Icon: MessageSquare },
  { href: "/notifications",      label: "Notifications", Icon: Bell },
  { href: "/assistant",          label: "AI Assistant", Icon: Bot },
];

export function MobileSidebar({ preset }: { preset: SidebarPreset }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    try { setRole(localStorage.getItem("user-role")); } catch { /* ignore */ }
  }, []);

  const items = preset === "admin" ? ADMIN_NAV
    : role === "mentor" ? MENTOR_NAV
    : role === "employer" ? EMPLOYER_NAV
    : STUDENT_NAV;

  useEffect(() => {
    function close() { setOpen(false); }
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="md:hidden p-2 rounded-md hover:bg-cream-200 text-ink-700"
      >
        <Menu size={18} />
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-[90]" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="relative h-full w-72 max-w-[80%] bg-cream-100 border-r border-cream-200 flex flex-col animate-fade-up">
            <div className="px-5 py-5 border-b border-cream-200 flex items-center justify-between">
              <Link href="/" onClick={() => setOpen(false)}>
                <Logo />
              </Link>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-1.5 rounded-md hover:bg-cream-200 text-ink-700">
                <X size={16} />
              </button>
            </div>

            {preset === "admin" && (
              <div className="px-5 py-3 border-b border-cream-200">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-600">
                  <AlertOctagon size={11} /> Admin console
                </span>
              </div>
            )}

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {items.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink-700 hover:bg-cream-200 transition"
                >
                  <n.Icon size={16} />
                  {n.label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
