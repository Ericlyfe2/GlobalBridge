"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, Settings, User, ShieldCheck, GraduationCap, Users, Briefcase, AlertOctagon } from "lucide-react";
import { logout } from "@/lib/auth";

type Role = "student" | "mentor" | "employer" | "admin";

const ROLES: Record<Role, { label: string; icon: React.ReactNode; tone: string }> = {
  student:  { label: "Student",  icon: <GraduationCap size={13} />, tone: "text-clay-600" },
  mentor:   { label: "Mentor",   icon: <Users size={13} />,         tone: "text-leaf-600" },
  employer: { label: "Employer", icon: <Briefcase size={13} />,     tone: "text-amber-500" },
  admin:    { label: "Admin",    icon: <AlertOctagon size={13} />,  tone: "text-red-600"  },
};

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [profile, setProfile] = useState<{
    name: string; email: string; initials: string; role: Role | null;
  }>({ name: "Guest", email: "Sign in to sync your account", initials: "G", role: null });

  const ref = useRef<HTMLDivElement>(null);

  // Auto presence — visible tab = online, hidden / blurred = away
  useEffect(() => {
    function update() { setOnline(document.visibilityState === "visible"); }
    update();
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
    };
  }, []);

  // Pull profile from localStorage (set during /register)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("gb-user");
      const user = raw ? JSON.parse(raw) : null;
      const initials = localStorage.getItem("user-initials");
      setProfile({
        name: user?.full_name || "Guest",
        email: user?.full_name ? (user?.email || "") : "Sign in to sync your account",
        initials: initials || (user?.full_name ? user.full_name[0].toUpperCase() : "G"),
        role: user?.role && user.role in ROLES ? user.role : null,
      });
    } catch {}
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function signOut() {
    logout().catch(() => {});
  }

  const presenceColor = online ? "bg-emerald-500" : "bg-amber-500";
  const presenceLabel = online ? "Online" : "Away";
  const roleMeta = profile.role ? ROLES[profile.role] : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`User menu — ${presenceLabel}`}
        className="relative w-8 h-8 rounded-full bg-clay-500 text-white flex items-center justify-center text-sm font-medium hover:bg-clay-600 transition"
      >
        {profile.initials}
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--color-cream-50)] ${presenceColor}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-lg border border-cream-200 bg-[var(--color-surface)] shadow-lg overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-cream-200">
            <p className="text-sm font-medium text-ink-900 truncate">{profile.name}</p>
            <p className="text-xs text-ink-500 truncate">{profile.email}</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-ink-700">
                <span className={`w-2 h-2 rounded-full ${presenceColor}`} />
                {presenceLabel}
              </span>
              {roleMeta && (
                <>
                  <span className="text-ink-400">·</span>
                  <span className={`flex items-center gap-1 ${roleMeta.tone}`}>
                    {roleMeta.icon}{roleMeta.label}
                  </span>
                </>
              )}
            </div>
          </div>

          <nav className="py-1">
            <MenuItem href="/dashboard/profile" icon={<User size={15} />} label="My Profile" />
            <MenuItem href="/dashboard/verification" icon={<ShieldCheck size={15} />} label="Verification" />
            <MenuItem href="/settings" icon={<Settings size={15} />} label="Settings" />
            {profile.role === "admin" && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-500/10 transition"
              >
                <AlertOctagon size={15} /> Admin console
              </Link>
            )}
          </nav>

          <div className="border-t border-cream-200 py-1">
            <Link
              href="/auth?mode=signin"
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-cream-100 transition"
            >
              <LogOut size={15} /> Sign out
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-cream-100 transition"
    >
      {icon} {label}
    </Link>
  );
}
