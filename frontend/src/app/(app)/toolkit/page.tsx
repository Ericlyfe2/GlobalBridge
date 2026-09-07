import Link from "next/link";
import {
  Calculator,
  Stethoscope,
  Landmark,
  PhoneCall,
  Bus,
  Smartphone,
  Tag,
  FileText,
  ArrowRight,
} from "lucide-react";

const tools = [
  { href: "/toolkit/cost",          icon: Calculator,  title: "Cost of Living Calculator", desc: "Compare rent, food, transport, utilities across cities.", tone: "clay",  ready: true },
  { href: "/toolkit/banking",       icon: Landmark,    title: "Banking Setup",             desc: "Which banks accept international students. Required docs. Account comparison.", tone: "sky",   ready: true },
  { href: "/toolkit/healthcare",    icon: Stethoscope, title: "Healthcare Navigation",     desc: "How to register with NHS, OHIP, GKV. Insurance options. Step-by-step.", tone: "leaf",  ready: true },
  { href: "/toolkit/sos",           icon: PhoneCall,   title: "Emergency SOS",             desc: "One-tap alert. Embassy contacts. Mental health hotlines. By country.", tone: "red",   ready: true },
  { href: "/toolkit/transit",       icon: Bus,         title: "Transportation",            desc: "Public transit, student discounts, bike rental, ride-share by city.", tone: "amber", ready: true },
  { href: "/toolkit/sim",           icon: Smartphone,  title: "SIM & Mobile",              desc: "Affordable plans for international students in each destination.", tone: "sky",   ready: true },
  { href: "/toolkit/discounts",     icon: Tag,         title: "Student Discounts",         desc: "Software, food, travel, entertainment. Verified by student ID.", tone: "leaf",  ready: true },
  { href: "/toolkit/tax",           icon: FileText,    title: "Tax Filing Guide",          desc: "How international students should handle taxes in UK, Canada, Germany, US.", tone: "clay",  ready: true },
  { href: "/toolkit/fund-transfer", icon: Landmark,    title: "Blocked-Country Fund Transfer", desc: "How to legally send tuition + living costs from Nigeria, Ghana, Zimbabwe, Egypt.", tone: "amber", ready: true },
];

const toneMap: Record<string, string> = {
  clay:  "bg-clay-500/15 text-clay-600",
  sky:   "bg-sky-500/15 text-sky-600",
  leaf:  "bg-leaf-500/15 text-leaf-600",
  red:   "bg-red-500/15 text-red-600",
  amber: "bg-amber-500/15 text-amber-500",
};

export default function ToolkitPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <header className="mb-10">
        <span className="badge badge-clay mb-3">Life Support Toolkit</span>
        <h1 className="text-3xl md:text-4xl font-display font-semibold text-ink-900">
          Less panicking, more thriving.
        </h1>
        <p className="text-sm text-ink-600 mt-2 max-w-2xl">
          Practical calculators, guides, and emergency resources for the first 90 days in a new country — and beyond.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {tools.map((t) => {
          const Card = (
            <div className="card h-full group">
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${toneMap[t.tone]}`}>
                  <t.icon size={20} />
                </div>
                {!t.ready && <span className="badge !bg-cream-200 !text-ink-600">Soon</span>}
              </div>

              <h3 className="font-display text-lg font-semibold text-ink-900 mt-4">{t.title}</h3>
              <p className="text-sm text-ink-600 leading-relaxed mt-1.5">{t.desc}</p>

              {t.ready && (
                <p className="mt-4 text-sm font-medium text-clay-600 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                  Open <ArrowRight size={13} />
                </p>
              )}
            </div>
          );

          return t.ready ? (
            <Link key={t.href} href={t.href} className="block">{Card}</Link>
          ) : (
            <div key={t.href} className="opacity-70 cursor-not-allowed">{Card}</div>
          );
        })}
      </div>
    </div>
  );
}
