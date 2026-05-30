"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase, Users, Eye, Clock, ArrowRight, MessageCircle, Plus, Loader2, FileText, Star, Calendar
} from "lucide-react";

export default function EmployerDashboard() {
  const router = useRouter();
  const [name, setName] = useState("");

  useEffect(() => {
    try {
      const role = localStorage.getItem("user-role");
      if (role !== "employer") router.replace("/dashboard");
      setName((localStorage.getItem("user-name") || "").split(" ")[0] || "");
    } catch { /* ignore */ }
  }, [router]);

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
      <div>
        <p className="text-sm font-medium text-clay-600">EMPLOYER DASHBOARD</p>
        <h1 className="mt-1 text-4xl font-display font-semibold text-ink-900 tracking-tight">
          Welcome back, {name || "Employer"}
        </h1>
        <p className="mt-2 text-ink-600">Manage your job postings, review applicants, and find top talent.</p>
      </div>

      <StatsGrid />
      <div className="grid lg:grid-cols-2 gap-6">
        <ActivePostings />
        <RecentApplicants />
      </div>
      <QuickActions />
    </div>
  );
}

function StatsGrid() {
  const stats = [
    { label: "Active postings", value: "5", icon: Briefcase, color: "clay" },
    { label: "Total applicants", value: "28", icon: Users, color: "leaf" },
    { label: "Profile views", value: "340", icon: Eye, color: "sky" },
    { label: "Avg. response", value: "2d", icon: Clock, color: "clay" },
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

function ActivePostings() {
  const postings = [
    { title: "Software Engineer Intern", applicants: 12, daysLeft: 14, status: "active" },
    { title: "Data Analyst — Co-op", applicants: 8, daysLeft: 21, status: "active" },
    { title: "Marketing Associate", applicants: 5, daysLeft: 7, status: "active" },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-ink-900">Active postings</h3>
        <Link href="/jobs" className="text-sm font-medium text-clay-600 hover:underline">
          Manage
        </Link>
      </div>
      <div className="space-y-3">
        {postings.map((p) => (
          <div key={p.title} className="flex items-start gap-3 p-3 rounded-lg border border-cream-200">
            <div className="w-9 h-9 rounded-lg bg-clay-500/12 text-clay-600 flex items-center justify-center shrink-0">
              <Briefcase size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-900">{p.title}</p>
              <p className="text-xs text-ink-500 mt-0.5">
                {p.applicants} applicants · {p.daysLeft} days left
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-leaf-500/12 text-leaf-600 font-medium self-center">
              Active
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentApplicants() {
  const applicants = [
    { name: "Ama Osei", role: "Software Engineer Intern", experience: "3 yr", initials: "AO", match: 92 },
    { name: "Kwame Asante", role: "Data Analyst", experience: "1 yr", initials: "KA", match: 85 },
    { name: "Esi Mensah", role: "Marketing Associate", experience: "2 yr", initials: "EM", match: 78 },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-ink-900">Recent applicants</h3>
        <Link href="/messages" className="text-sm font-medium text-clay-600 hover:underline">
          Messages
        </Link>
      </div>
      <div className="space-y-3">
        {applicants.map((a) => (
          <div key={a.name} className="flex items-start gap-3 p-3 rounded-lg border border-cream-200">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-leaf-500 to-leaf-700 text-white flex items-center justify-center text-sm font-medium shrink-0">
              {a.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-900">{a.name}</p>
              <p className="text-xs text-ink-500">{a.role} · {a.experience}</p>
              <div className="mt-1 flex items-center gap-1">
                <Star size={10} className="fill-amber-500 text-amber-500" />
                <span className="text-xs text-ink-600">{a.match}% match</span>
              </div>
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

function QuickActions() {
  return (
    <div className="card">
      <h3 className="font-display text-lg font-semibold text-ink-900 mb-4">Quick actions</h3>
      <div className="grid sm:grid-cols-3 gap-3">
        <Link
          href="/jobs"
          className="flex items-center gap-3 p-4 rounded-lg border border-cream-200 hover:border-clay-300 hover:bg-cream-50 transition"
        >
          <Plus size={18} className="text-clay-500" />
          <div>
            <p className="text-sm font-medium text-ink-900">Post a job</p>
            <p className="text-xs text-ink-500">Reach qualified candidates</p>
          </div>
        </Link>
        <Link
          href="/community"
          className="flex items-center gap-3 p-4 rounded-lg border border-cream-200 hover:border-clay-300 hover:bg-cream-50 transition"
        >
          <Users size={18} className="text-clay-500" />
          <div>
            <p className="text-sm font-medium text-ink-900">Browse candidates</p>
            <p className="text-xs text-ink-500">Find talent from our network</p>
          </div>
        </Link>
        <Link
          href="/assistant"
          className="flex items-center gap-3 p-4 rounded-lg border border-cream-200 hover:border-clay-300 hover:bg-cream-50 transition"
        >
          <FileText size={18} className="text-clay-500" />
          <div>
            <p className="text-sm font-medium text-ink-900">AI job description</p>
            <p className="text-xs text-ink-500">Generate a listing with AI</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
