"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FileText, ArrowLeft, Download, Sparkles, Mail, Phone, MapPin, Linkedin, Github, Plus, Trash2,
} from "lucide-react";

type Region = "uk" | "us" | "de";

const regionMeta: Record<Region, { label: string; flag: string; doc: string; pageSize: string; tone: string; tips: string[] }> = {
  uk: {
    label: "UK CV", flag: "gb", doc: "Curriculum Vitae", pageSize: "A4 · 2 pages max",
    tone: "Conservative, third-person summary, hobbies optional",
    tips: ["No photo", "No date of birth", "Keep references 'available on request'", "Include right-to-work statement only if not already obvious"],
  },
  us: {
    label: "US Resume", flag: "us", doc: "Resume", pageSize: "Letter · 1 page (junior), 2 pages (senior)",
    tone: "Achievement-driven, metric-heavy bullets, action verbs",
    tips: ["No photo", "No date of birth", "Quantify everything (%, $, time)", "Skip 'References on request'", "No GPA after first job"],
  },
  de: {
    label: "Lebenslauf", flag: "de", doc: "Tabellarischer Lebenslauf", pageSize: "A4 · 1-2 pages",
    tone: "Tabular, factual, photo standard, signed + dated",
    tips: ["Photo top-right (professional headshot)", "Date + place of birth included", "Signed and dated at bottom", "Include Sprachkenntnisse (language skills) section"],
  },
};

type Exp = { id: string; title: string; org: string; from: string; to: string; bullets: string };

export default function ResumeBuilder() {
  const [region, setRegion]   = useState<Region>("uk");
  const [name, setName]       = useState("Kwaku Adu Sarfo");
  const [headline, setHeadline] = useState("Computer Science Student · Full-stack Web Developer");
  const [email, setEmail]     = useState("kwaku@example.com");
  const [phone, setPhone]     = useState("+233 24 000 0000");
  const [loc, setLoc]         = useState("Kumasi, Ghana");
  const [linkedin, setLinkedin] = useState("kwakuadusarfo");
  const [github, setGithub]   = useState("kwakuadu");
  const [summary, setSummary] = useState("Final-year IT student at KNUST building production web apps. Strong TypeScript + React + Node. Cybersecurity research interest, comfortable with CTF-style problems.");
  const [skills, setSkills]   = useState("TypeScript, React, Next.js, Node.js, Express, PostgreSQL, Tailwind, Git, Linux, Python");
  const [experience, setExperience] = useState<Exp[]>([
    { id: "e1", title: "Frontend Developer (Intern)", org: "TechCo Ghana", from: "Jun 2025", to: "Sep 2025", bullets: "Shipped new dashboard reducing bounce 23%.\nBuilt component library used across 4 internal apps.\nMentored 2 junior interns." },
    { id: "e2", title: "Personal Projects",            org: "Open source",   from: "2024",     to: "Present",   bullets: "GlobalBridge — international student platform (this app).\nKNUST shuttle tracker — used by 800+ students." },
  ]);
  const [education, setEducation] = useState("BSc Information Technology · KNUST · Expected 2026 · GPA 3.7/4.0");
  const [languages, setLanguages] = useState("English (fluent), Twi (native), French (intermediate)");

  function addExp() {
    setExperience((arr) => [...arr, { id: `e${Date.now()}`, title: "", org: "", from: "", to: "", bullets: "" }]);
  }
  function rmExp(id: string) {
    setExperience((arr) => arr.filter((e) => e.id !== id));
  }
  function updExp(id: string, k: keyof Exp, v: string) {
    setExperience((arr) => arr.map((e) => (e.id === id ? { ...e, [k]: v } : e)));
  }

  const meta = regionMeta[region];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <Link href="/jobs" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to jobs
      </Link>

      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-clay-500/15 text-clay-600 flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-display font-semibold text-ink-900 flex items-center gap-2">
              Resume Builder
              <span className="badge badge-clay text-[10px]"><Sparkles size={10} /> AI tips</span>
            </h1>
            <p className="text-sm text-ink-600 mt-0.5">Country-specific templates. UK CV, US Resume, German Lebenslauf.</p>
          </div>
        </div>
        <button className="btn-accent text-sm" onClick={() => window.print()}>
          <Download size={14} /> Export PDF
        </button>
      </header>

      {/* Region tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.keys(regionMeta) as Region[]).map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${
              region === r ? "bg-clay-500 text-white" : "bg-cream-100 text-ink-700 hover:bg-cream-200"
            }`}
          >
            <span className={`fi fi-${meta.flag === regionMeta[r].flag ? regionMeta[r].flag : regionMeta[r].flag}`} aria-hidden="true" />
            {regionMeta[r].label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-display text-base font-semibold text-ink-900 mb-3">Identity</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name"><input value={name} onChange={(e) => setName(e.target.value)} className="input" /></Field>
              <Field label="Headline / target role"><input value={headline} onChange={(e) => setHeadline(e.target.value)} className="input" /></Field>
              <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} className="input" /></Field>
              <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" /></Field>
              <Field label="Location"><input value={loc} onChange={(e) => setLoc(e.target.value)} className="input" /></Field>
              <Field label="LinkedIn"><input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="input" /></Field>
              <Field label="GitHub"><input value={github} onChange={(e) => setGithub(e.target.value)} className="input" /></Field>
            </div>
          </div>

          <div className="card">
            <h2 className="font-display text-base font-semibold text-ink-900 mb-3">Summary</h2>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="input min-h-[100px]" />
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold text-ink-900">Experience</h2>
              <button onClick={addExp} className="text-xs text-clay-600 font-medium hover:underline inline-flex items-center gap-1">
                <Plus size={11} /> Add
              </button>
            </div>
            <div className="space-y-3">
              {experience.map((e) => (
                <div key={e.id} className="border border-cream-200 rounded-md p-3">
                  <div className="flex justify-end mb-1">
                    <button onClick={() => rmExp(e.id)} className="text-xs text-red-600 hover:underline inline-flex items-center gap-1">
                      <Trash2 size={11} /> Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={e.title} onChange={(ev) => updExp(e.id, "title", ev.target.value)} placeholder="Role title" className="input text-sm" />
                    <input value={e.org}   onChange={(ev) => updExp(e.id, "org",   ev.target.value)} placeholder="Organisation" className="input text-sm" />
                    <input value={e.from}  onChange={(ev) => updExp(e.id, "from",  ev.target.value)} placeholder="From" className="input text-sm" />
                    <input value={e.to}    onChange={(ev) => updExp(e.id, "to",    ev.target.value)} placeholder="To" className="input text-sm" />
                  </div>
                  <textarea value={e.bullets} onChange={(ev) => updExp(e.id, "bullets", ev.target.value)} placeholder="One achievement per line" className="input mt-2 text-sm min-h-[70px]" />
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="font-display text-base font-semibold text-ink-900 mb-3">Education</h2>
            <textarea value={education} onChange={(e) => setEducation(e.target.value)} className="input min-h-[60px]" />
          </div>

          <div className="card">
            <h2 className="font-display text-base font-semibold text-ink-900 mb-3">Skills</h2>
            <input value={skills} onChange={(e) => setSkills(e.target.value)} className="input" />
          </div>

          <div className="card">
            <h2 className="font-display text-base font-semibold text-ink-900 mb-3">Languages</h2>
            <input value={languages} onChange={(e) => setLanguages(e.target.value)} className="input" />
          </div>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-20 self-start space-y-3">
          <div className="card !bg-white !text-slate-900 dark:!bg-slate-100 shadow-md max-h-[calc(100vh-10rem)] overflow-y-auto print:shadow-none print:!bg-white">
            {/* Header */}
            {region === "de" ? (
              <DeHeader name={name} headline={headline} email={email} phone={phone} loc={loc} />
            ) : (
              <DefaultHeader name={name} headline={headline} email={email} phone={phone} loc={loc} linkedin={linkedin} github={github} />
            )}

            <Section title={region === "de" ? "Profil" : "Summary"}>{summary}</Section>

            <Section title={region === "de" ? "Berufserfahrung" : "Experience"}>
              <div className="space-y-3">
                {experience.map((e) => (
                  <div key={e.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-semibold text-slate-900">{e.title}{e.org && <> · <span className="font-normal">{e.org}</span></>}</p>
                      <span className="text-xs text-slate-500 whitespace-nowrap">{e.from}{e.from && e.to && "–"}{e.to}</span>
                    </div>
                    <ul className="mt-1 pl-4 list-disc text-sm text-slate-700 space-y-0.5">
                      {e.bullets.split("\n").filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>

            <Section title={region === "de" ? "Ausbildung" : "Education"}>
              <p className="text-sm text-slate-700">{education}</p>
            </Section>

            <Section title="Skills">
              <p className="text-sm text-slate-700">{skills}</p>
            </Section>

            {region === "de" && (
              <Section title="Sprachkenntnisse">
                <p className="text-sm text-slate-700">{languages}</p>
              </Section>
            )}

            {region === "de" && (
              <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-600 flex justify-between">
                <span>{loc}, {new Date().toLocaleDateString("de-DE")}</span>
                <span>{name}</span>
              </div>
            )}
          </div>

          {/* Format guidance */}
          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider text-clay-600 mb-2 flex items-center gap-1">
              <Sparkles size={11} /> {meta.label} format
            </p>
            <p className="text-sm text-ink-700 mb-2">{meta.pageSize} · {meta.tone}</p>
            <ul className="text-xs text-ink-600 space-y-1">
              {meta.tips.map((t) => <li key={t}>• {t}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ink-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-1 mb-2">{title}</h3>
      <div className="text-sm text-slate-700 leading-relaxed">{children}</div>
    </section>
  );
}

function DefaultHeader({ name, headline, email, phone, loc, linkedin, github }: { name: string; headline: string; email: string; phone: string; loc: string; linkedin: string; github: string }) {
  return (
    <>
      <h1 className="text-2xl font-display font-semibold text-slate-900">{name}</h1>
      <p className="text-sm text-slate-600 mt-0.5">{headline}</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {email && <span className="inline-flex items-center gap-1"><Mail size={11} /> {email}</span>}
        {phone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {phone}</span>}
        {loc &&   <span className="inline-flex items-center gap-1"><MapPin size={11} /> {loc}</span>}
        {linkedin && <span className="inline-flex items-center gap-1"><Linkedin size={11} /> {linkedin}</span>}
        {github &&   <span className="inline-flex items-center gap-1"><Github size={11} /> {github}</span>}
      </div>
    </>
  );
}

function DeHeader({ name, headline, email, phone, loc }: { name: string; headline: string; email: string; phone: string; loc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-20 h-24 rounded-md bg-slate-200 flex items-center justify-center text-slate-500 text-xs shrink-0">
        Foto
      </div>
      <div className="flex-1">
        <h1 className="text-2xl font-display font-semibold text-slate-900">{name}</h1>
        <p className="text-sm text-slate-600 mt-0.5">{headline}</p>
        <table className="mt-2 text-xs text-slate-700">
          <tbody>
            <tr><td className="pr-3 font-medium">E-Mail</td><td>{email}</td></tr>
            <tr><td className="pr-3 font-medium">Telefon</td><td>{phone}</td></tr>
            <tr><td className="pr-3 font-medium">Wohnort</td><td>{loc}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
