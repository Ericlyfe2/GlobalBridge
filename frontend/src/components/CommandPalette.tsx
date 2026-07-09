"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import {
  Search, ArrowRight, LayoutDashboard, Bot, Award, Home, Users, Briefcase, MessageSquare,
  Bell, LifeBuoy, ShieldCheck, FileCheck, Calendar, Settings, AlertOctagon, Sparkles,
  PhoneCall, Landmark, Stethoscope, Flag, Quote, MessagesSquare, FileText,
  Headphones, Wand2, BarChart3, Lock, GraduationCap, DollarSign, Bus, Smartphone, Tag,
} from "lucide-react";

type Item = {
  id: string; label: string; group: string; href: string;
  icon: React.ReactNode; hint?: string;
};

const adminItems: Item[] = [
  { id: "adm",   label: "Admin Console",     group: "Admin", href: "/admin",                 icon: <AlertOctagon size={14} /> },
  { id: "advu",  label: "Admin · Users",     group: "Admin", href: "/admin/users",           icon: <Users size={14} /> },
  { id: "advv",  label: "Admin · Verifications", group: "Admin", href: "/admin/verifications", icon: <ShieldCheck size={14} /> },
  { id: "advl",  label: "Admin · Listings",  group: "Admin", href: "/admin/listings",        icon: <FileText size={14} /> },
  { id: "advr",  label: "Admin · Reports",   group: "Admin", href: "/admin/reports",         icon: <Flag size={14} /> },
];

const baseItems: Item[] = [
  { id: "dash",  label: "Dashboard",         group: "App", href: "/dashboard",     icon: <LayoutDashboard size={14} /> },
  { id: "ai",    label: "AI Assistant",      group: "App", href: "/assistant",     icon: <Bot size={14} />, hint: "Visa Q&A" },
  { id: "opps",  label: "Opportunities",     group: "App", href: "/opportunities", icon: <Award size={14} /> },
  { id: "house", label: "Housing",           group: "App", href: "/housing",       icon: <Home size={14} /> },
  { id: "comm",  label: "Community",         group: "App", href: "/community",     icon: <Users size={14} /> },
  { id: "jobs",  label: "Jobs",              group: "App", href: "/jobs",          icon: <Briefcase size={14} /> },
  { id: "msg",   label: "Messages",          group: "App", href: "/messages",      icon: <MessageSquare size={14} /> },
  { id: "noti",  label: "Notifications",     group: "App", href: "/notifications", icon: <Bell size={14} /> },
  { id: "tool",  label: "Toolkit",           group: "App", href: "/toolkit",       icon: <LifeBuoy size={14} /> },
  { id: "for",   label: "Forums",            group: "App", href: "/forums",        icon: <MessagesSquare size={14} /> },
  { id: "stor",  label: "Success Stories",   group: "App", href: "/stories",       icon: <Quote size={14} /> },
  { id: "scam",  label: "Scam Alerts",       group: "App", href: "/scam-alerts",   icon: <Flag size={14} /> },
  { id: "lib",   label: "Podcast & Video Library", group: "App", href: "/library", icon: <Headphones size={14} />, hint: "Student stories, vlogs, interviews" },
  { id: "safe",  label: "Safe Space (anonymous)",  group: "App", href: "/community/safe-space", icon: <Lock size={14} />, hint: "Mental health, discrimination, legal" },

  { id: "doc",     label: "AI Document Checker",     group: "AI Tools", href: "/tools/doc-checker",          icon: <FileCheck size={14} />,  hint: "Validate passport, transcript" },
  { id: "match",   label: "Scholarship Matcher",     group: "AI Tools", href: "/tools/scholarship-matcher",  icon: <Sparkles size={14} />,   hint: "Profile → ranked matches" },
  { id: "tline",   label: "Timeline Planner",        group: "AI Tools", href: "/tools/timeline",             icon: <Calendar size={14} />,   hint: "Visa to arrival milestones" },
  { id: "coach",   label: "AI Application Coach",    group: "AI Tools", href: "/tools/app-coach",            icon: <Wand2 size={14} />,      hint: "SoP / essay scoring" },
  { id: "uni",     label: "University Success Dashboard", group: "AI Tools", href: "/tools/uni-success",     icon: <BarChart3 size={14} />,  hint: "Visa approval, employment, satisfaction" },
  { id: "peer",    label: "Peer Essay Review",       group: "AI Tools", href: "/tools/peer-review",          icon: <Users size={14} />,      hint: "Anonymous structured feedback" },

  { id: "resume",  label: "Resume Builder",          group: "Jobs",    href: "/jobs/resume-builder",        icon: <FileText size={14} />,   hint: "UK CV, US Resume, Lebenslauf" },
  { id: "sponsor", label: "Visa Sponsorship Tracker", group: "Jobs",    href: "/jobs/sponsorship-tracker",   icon: <ShieldCheck size={14} />, hint: "Companies that sponsor" },
  { id: "salary",  label: "Salary Benchmarking",     group: "Jobs",    href: "/jobs/salary",                icon: <DollarSign size={14} />, hint: "Median pay by role + country" },
  { id: "ready",   label: "Job Readiness Courses",   group: "Jobs",    href: "/jobs/readiness",             icon: <GraduationCap size={14} />, hint: "Culture, interview, rights" },

  { id: "cost",    label: "Cost of Living Calculator", group: "Toolkit", href: "/toolkit/cost",       icon: <Landmark size={14} /> },
  { id: "bank",    label: "Banking Setup",             group: "Toolkit", href: "/toolkit/banking",    icon: <Landmark size={14} /> },
  { id: "hlth",    label: "Healthcare Navigation",     group: "Toolkit", href: "/toolkit/healthcare", icon: <Stethoscope size={14} /> },
  { id: "sos",     label: "Emergency SOS",             group: "Toolkit", href: "/toolkit/sos",        icon: <PhoneCall size={14} /> },
  { id: "transit", label: "Transportation",            group: "Toolkit", href: "/toolkit/transit",    icon: <Bus size={14} /> },
  { id: "sim",     label: "SIM & Mobile",              group: "Toolkit", href: "/toolkit/sim",        icon: <Smartphone size={14} /> },
  { id: "disc",    label: "Student Discounts",         group: "Toolkit", href: "/toolkit/discounts",  icon: <Tag size={14} /> },
  { id: "tax",     label: "Tax Filing Guide",          group: "Toolkit", href: "/toolkit/tax",        icon: <FileText size={14} /> },
  { id: "fund",    label: "Blocked-Country Fund Transfer", group: "Toolkit", href: "/toolkit/fund-transfer", icon: <Landmark size={14} />, hint: "Nigeria, Ghana, Zimbabwe..." },

  { id: "c-gh",  label: "Ghana community",   group: "Country hubs", href: "/community/ghana",  icon: <Users size={14} /> },
  { id: "c-ng",  label: "Nigeria community", group: "Country hubs", href: "/community/nigeria", icon: <Users size={14} /> },
  { id: "c-in",  label: "India community",   group: "Country hubs", href: "/community/india",  icon: <Users size={14} /> },

  { id: "prof",  label: "My Profile",        group: "Account", href: "/dashboard/profile",       icon: <Users size={14} /> },
  { id: "vrf",   label: "Verification",      group: "Account", href: "/dashboard/verification",  icon: <ShieldCheck size={14} /> },
  { id: "set",   label: "Settings",          group: "Account", href: "/settings",                icon: <Settings size={14} /> },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const isAdmin = typeof window !== "undefined" && getUser()?.role === "admin";

  const items = useMemo(() => isAdmin ? [...baseItems, ...adminItems] : baseItems, [isAdmin]);

  // Open on Cmd/Ctrl + K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!q) return items;
    const lc = q.toLowerCase();
    return items.filter((i) =>
      `${i.label} ${i.hint ?? ""} ${i.group}`.toLowerCase().includes(lc),
    );
  }, [q, items]);

  const grouped = useMemo(() => {
    const m: Record<string, Item[]> = {};
    filtered.forEach((i) => { (m[i.group] ??= []).push(i); });
    return m;
  }, [filtered]);

  // Flat list for keyboard nav
  const flat = useMemo(() => Object.values(grouped).flat(), [grouped]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, flat.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); const hit = flat[active]; if (hit) go(hit.href); }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-xl rounded-xl border border-cream-200 bg-[var(--color-surface)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-cream-200">
          <Search size={16} className="text-ink-500 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={onInputKey}
            placeholder="Search pages, tools, mentors..."
            aria-label="Search pages, tools, and destinations"
            className="flex-1 bg-transparent outline-none text-sm text-ink-900 placeholder:text-ink-500"
          />
          <kbd className="text-[10px] text-ink-500 px-1.5 py-0.5 rounded border border-cream-200">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {flat.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-500">Nothing matches &ldquo;{q}&rdquo;.</p>
          ) : (
            Object.entries(grouped).map(([group, list]) => (
              <div key={group} className="mb-1">
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-500">{group}</p>
                {list.map((i) => {
                  const idx = flat.indexOf(i);
                  const isActive = idx === active;
                  return (
                    <button
                      key={i.id}
                      onClick={() => go(i.href)}
                      onMouseEnter={() => setActive(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition ${
                        isActive ? "bg-clay-500/10 text-ink-900" : "text-ink-700 hover:bg-cream-100"
                      }`}
                    >
                      <span className="text-ink-500">{i.icon}</span>
                      <span className="flex-1 min-w-0 truncate">{i.label}</span>
                      {i.hint && <span className="text-xs text-ink-500 truncate">{i.hint}</span>}
                      <ArrowRight size={12} className={isActive ? "text-clay-600" : "text-ink-400"} />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-cream-200 px-4 py-2 text-[10px] text-ink-500 flex items-center justify-between">
          <span>Navigate with <kbd className="px-1 border border-cream-200 rounded">↑</kbd> <kbd className="px-1 border border-cream-200 rounded">↓</kbd></span>
          <span><kbd className="px-1 border border-cream-200 rounded">⏎</kbd> open</span>
        </div>
      </div>
    </div>
  );
}

// Trigger button (for header)
export function CommandTrigger() {
  function open() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
  }
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open command palette"
      className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md border border-cream-300 text-xs text-ink-500 hover:bg-cream-200 transition"
    >
      <Search size={12} />
      <span>Search...</span>
      <kbd className="ml-2 px-1.5 py-0.5 rounded border border-cream-300 text-[10px]">⌘K</kbd>
    </button>
  );
}
