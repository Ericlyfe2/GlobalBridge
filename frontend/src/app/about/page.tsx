import Link from "next/link";
import { Globe, Heart, Shield, Sparkles, Users, ArrowRight, Award } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const values = [
  { icon: Heart,     title: "Empathy first",         body: "We were international students once. Every feature is built from real frustration, not whiteboard guesses." },
  { icon: Shield,    title: "Verified or nothing",   body: "Listings, mentors, and scholarships are screened before publishing. We'd rather have 100 verified opportunities than 10,000 random ones." },
  { icon: Globe,     title: "Global by default",     body: "Built for students in Lagos, Manila, Lima, and Dhaka — not just for those in the West. 50+ languages, 30+ destination countries." },
  { icon: Users,     title: "Community over algorithm", body: "Mentors and peers are the heart of the platform. AI accelerates, but doesn't replace human guidance." },
];

const team = [
  { name: "Eric Asante",       role: "Backend + Database", student_id: "3376122", initials: "EA" },
  { name: "Baddoo Jeremiah N.", role: "Frontend + UI/UX",  student_id: "3381622", initials: "BJ" },
];

const milestones = [
  { date: "Oct 2024", label: "Project kickoff at KNUST" },
  { date: "Jan 2025", label: "First mentor onboarded" },
  { date: "Mar 2025", label: "AI Visa Assistant alpha" },
  { date: "May 2025", label: "1,000 students using the platform" },
  { date: "Sep 2025", label: "Housing marketplace live" },
  { date: "Apr 2026", label: "12k+ users · 200+ verified mentors" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-24">
        <div className="max-w-3xl">
          <span className="badge badge-clay mb-3">About</span>
          <h1 className="text-4xl md:text-6xl font-display font-semibold text-ink-900 tracking-tight leading-[1.05]">
            We&apos;re the bridge we wished we had.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-ink-600 leading-relaxed">
            GlobalBridge started as a Final Year Project at KNUST in 2024.
            We were two CS students from Ghana watching friends get scammed by fake visa agents,
            losing thousands of dollars to fake housing listings, and graduating with nowhere to go because no one shared the playbook.
          </p>
          <p className="mt-4 text-lg md:text-xl text-ink-600 leading-relaxed">
            So we built the playbook. Then we built the platform around it.
          </p>
        </div>
      </section>

      {/* Mission strip */}
      <section className="bg-cream-100 border-y border-cream-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 grid sm:grid-cols-3 gap-8 text-center">
          <Stat value="12,438" label="Students supported" />
          <Stat value="200+"   label="Verified mentors" />
          <Stat value="30+"    label="Destination countries" />
        </div>
      </section>

      {/* Values */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-medium text-clay-600 mb-3">WHAT WE BELIEVE</p>
          <h2 className="text-4xl font-display font-semibold text-ink-900">
            Four principles that drive every decision.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {values.map((v) => (
            <article key={v.title} className="card">
              <div className="w-10 h-10 rounded-lg bg-clay-500/15 text-clay-600 flex items-center justify-center mb-3">
                <v.icon size={18} />
              </div>
              <h3 className="font-display text-xl font-semibold text-ink-900">{v.title}</h3>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">{v.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-cream-100 border-y border-cream-200">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-20">
          <h2 className="font-display text-3xl font-semibold text-ink-900 mb-8 flex items-center gap-2">
            <Sparkles size={20} className="text-clay-500" /> Our journey so far
          </h2>
          <ol className="relative border-l-2 border-clay-500/30 pl-6 space-y-6">
            {milestones.map((m, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[35px] top-1.5 w-3 h-3 rounded-full bg-clay-500 ring-4 ring-cream-100" />
                <p className="text-xs font-mono uppercase tracking-wider text-clay-600">{m.date}</p>
                <p className="text-base text-ink-900 mt-0.5">{m.label}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Team */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-medium text-clay-600 mb-3">TEAM</p>
          <h2 className="text-4xl font-display font-semibold text-ink-900">
            Built by two, for thousands.
          </h2>
          <p className="mt-3 text-ink-600">Group 8 · KNUST IT Final Year Project · Academic Year 2024/2025.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl">
          {team.map((p) => (
            <div key={p.name} className="card flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-clay-500 to-clay-700 text-white flex items-center justify-center text-lg font-display font-semibold shrink-0">
                {p.initials}
              </div>
              <div>
                <p className="font-medium text-ink-900">{p.name}</p>
                <p className="text-sm text-ink-600">{p.role}</p>
                <p className="text-xs text-ink-500 mt-0.5 font-mono">Student ID: {p.student_id}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 pb-24">
        <div className="card !p-12 !border-0 bg-gradient-to-br from-clay-500 to-clay-700 text-white overflow-hidden relative">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="relative max-w-2xl">
            <Award className="mb-3" size={28} />
            <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight">
              Want to mentor? Apply now.
            </h2>
            <p className="mt-3 text-white/85">
              If you&apos;ve studied or worked abroad and want to give back, we&apos;ll get you verified within 48h.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/register?role=mentor" className="btn-primary !bg-white !text-slate-900 hover:!bg-slate-100">
                Become a mentor <ArrowRight size={14} />
              </Link>
              <Link href="/contact" className="btn-ghost !text-white border border-white/30 hover:!bg-white/10">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-4xl md:text-5xl font-semibold text-clay-600">{value}</p>
      <p className="text-sm text-ink-600 mt-1">{label}</p>
    </div>
  );
}
