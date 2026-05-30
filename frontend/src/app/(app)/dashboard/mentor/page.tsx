"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Calendar, Clock, MessageCircle, Star, ArrowRight, Settings, Loader2, ShieldCheck, GraduationCap, Award
} from "lucide-react";

export default function MentorDashboard() {
  const router = useRouter();
  const [name, setName] = useState("");

  useEffect(() => {
    try {
      const role = localStorage.getItem("user-role");
      if (role !== "mentor") router.replace("/dashboard");
      setName((localStorage.getItem("user-name") || "").split(" ")[0] || "");
    } catch { /* ignore */ }
  }, [router]);

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
      <div>
        <p className="text-sm font-medium text-clay-600">MENTOR DASHBOARD</p>
        <h1 className="mt-1 text-4xl font-display font-semibold text-ink-900 tracking-tight">
          Welcome back, {name || "Mentor"}
        </h1>
        <p className="mt-2 text-ink-600">Manage your sessions, mentees, and availability.</p>
      </div>

      <StatsGrid />
      <div className="grid lg:grid-cols-2 gap-6">
        <UpcomingSessions />
        <RecentMentees />
      </div>
      <QuickActions />
    </div>
  );
}

function StatsGrid() {
  const stats = [
    { label: "Active mentees", value: "12", icon: Users, color: "clay" },
    { label: "Sessions this month", value: "24", icon: Calendar, color: "leaf" },
    { label: "Rating", value: "4.9", icon: Star, color: "sky" },
    { label: "Reply rate", value: "95%", icon: Clock, color: "clay" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="card">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            s.color === "clay" ? "bg-clay-500/12 text-clay-600" :
            s.color === "leaf" ? "bg-leaf-500/12 text-leaf-600" :
            "bg-sky-500/12 text-sky-600"
          }`}>
            <s.icon size={18} />
          </div>
          <p className="mt-3 text-2xl font-display font-semibold text-ink-900">{s.value}</p>
          <p className="text-sm text-ink-500">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function UpcomingSessions() {
  const sessions = [
    { name: "Kwame A.", time: "Today · 18:00", topic: "Canada study permit", initials: "KA" },
    { name: "Adaeze N.", time: "Tomorrow · 16:30", topic: "DAAD scholarship", initials: "AN" },
    { name: "Esi M.", time: "May 28 · 19:00", topic: "PGWP pathway", initials: "EM" },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-ink-900">Upcoming sessions</h3>
        <Link href="/dashboard/mentor" className="text-sm font-medium text-clay-600 hover:underline">
          View all
        </Link>
      </div>
      <div className="space-y-3">
        {sessions.map((s) => (
          <div key={s.name} className="flex items-start gap-3 p-3 rounded-lg border border-cream-200">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-clay-500 to-clay-700 text-white flex items-center justify-center text-sm font-medium shrink-0">
              {s.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-900">{s.name}</p>
              <p className="text-xs text-ink-500 mt-0.5">{s.time}</p>
              <p className="text-xs text-ink-600 mt-1 flex items-center gap-1">
                <GraduationCap size={11} /> {s.topic}
              </p>
            </div>
            <Link href="/messages" className="text-clay-600 hover:text-clay-700 p-1">
              <MessageCircle size={15} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentMentees() {
  const mentees = [
    { name: "Akosua B.", from: "Accra → Toronto", status: "Visa applied", initials: "AB", flag: true },
    { name: "Kojo D.", from: "Kumasi → London", status: "Offer accepted", initials: "KD", flag: false },
    { name: "Ama O.", from: "Lagos → Berlin", status: "Application prep", initials: "AO", flag: true },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-ink-900">Active mentees</h3>
        <Link href="/messages" className="text-sm font-medium text-clay-600 hover:underline">
          Messages
        </Link>
      </div>
      <div className="space-y-3">
        {mentees.map((m) => (
          <div key={m.name} className="flex items-start gap-3 p-3 rounded-lg border border-cream-200">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-leaf-500 to-leaf-700 text-white flex items-center justify-center text-sm font-medium shrink-0">
              {m.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-ink-900">{m.name}</p>
                {m.flag && <ShieldCheck size={11} className="text-leaf-600" />}
              </div>
              <p className="text-xs text-ink-500">{m.from}</p>
              <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-clay-500/12 text-clay-600 font-medium">
                {m.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActions() {
  return (
    <div className="card">
      <h3 className="font-display text-lg font-semibold text-ink-900 mb-4">Quick actions</h3>
      <div className="grid sm:grid-cols-3 gap-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 p-4 rounded-lg border border-cream-200 hover:border-clay-300 hover:bg-cream-50 transition"
        >
          <Calendar size={18} className="text-clay-500" />
          <div>
            <p className="text-sm font-medium text-ink-900">Manage availability</p>
            <p className="text-xs text-ink-500">Set your weekly schedule</p>
          </div>
        </Link>
        <Link
          href="/community"
          className="flex items-center gap-3 p-4 rounded-lg border border-cream-200 hover:border-clay-300 hover:bg-cream-50 transition"
        >
          <Users size={18} className="text-clay-500" />
          <div>
            <p className="text-sm font-medium text-ink-900">Browse mentees</p>
            <p className="text-xs text-ink-500">Connect with new students</p>
          </div>
        </Link>
        <Link
          href="/assistant"
          className="flex items-center gap-3 p-4 rounded-lg border border-cream-200 hover:border-clay-300 hover:bg-cream-50 transition"
        >
          <Award size={18} className="text-clay-500" />
          <div>
            <p className="text-sm font-medium text-ink-900">Share advice</p>
            <p className="text-xs text-ink-500">Write a guide or tip</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
