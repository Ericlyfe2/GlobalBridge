"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText, ArrowLeft, Calendar, Banknote, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";

type Country = "ca" | "uk" | "de" | "us";

const flags: Record<Country, string> = { ca: "ca", uk: "gb", de: "de", us: "us" };
const labels: Record<Country, string> = { ca: "Canada", uk: "United Kingdom", de: "Germany", us: "United States" };

type Profile = {
  country: Country; system: string; deadline: string; year: string;
  filingRequired: string;
  forms: { id: string; name: string; purpose: string }[];
  refundsTypical: string;
  treaties: string[];
  steps: string[];
  pitfalls: string[];
  officialUrl: string;
};

const data: Record<Country, Profile> = {
  ca: {
    country: "ca",
    system: "Canada Revenue Agency (CRA) — calendar-year filing",
    deadline: "April 30 (following year)",
    year: "Jan 1 – Dec 31",
    filingRequired: "If you earned ANY Canadian income, or want to claim tuition credits / GST refund.",
    forms: [
      { id: "T1",   name: "T1 General",      purpose: "Main personal tax return" },
      { id: "T4",   name: "T4",              purpose: "Employment income slip (employer issues)" },
      { id: "T2202",name: "T2202",           purpose: "Tuition + months enrolled (university issues)" },
      { id: "T4A",  name: "T4A",             purpose: "Scholarships, fellowships, RA stipends" },
    ],
    refundsTypical: "Most international students get a refund — tuition credits + GST/HST credit.",
    treaties: ["Ghana–Canada", "Nigeria–Canada", "India–Canada", "UK–Canada", "Germany–Canada"],
    steps: [
      "Get your SIN (or ITN if no SIN)",
      "Collect T4, T2202, T4A slips from employers + university",
      "File via NETFILE (Wealthsimple Tax, TurboTax — free for students)",
      "Submit by April 30. Refund arrives in 2–8 weeks via direct deposit.",
    ],
    pitfalls: [
      "Missing T2202 → no tuition credit carry-forward (worth thousands)",
      "Not filing means losing GST/HST credit (CAD ~500/yr)",
      "Tax residency vs. immigration residency are different — most full-time students are tax residents",
    ],
    officialUrl: "https://canada.ca/cra",
  },
  uk: {
    country: "uk",
    system: "HMRC — Self Assessment for self-employed; PAYE for employees",
    deadline: "January 31 (online) for prior April–April tax year",
    year: "April 6 – April 5",
    filingRequired: "Only if self-employed OR earned over £100k OR have foreign income > £2k. Most PAYE students do NOT file.",
    forms: [
      { id: "SA100", name: "Self Assessment (SA100)", purpose: "Personal tax return — only if required" },
      { id: "P60",   name: "P60",                      purpose: "Annual summary from employer" },
      { id: "P45",   name: "P45",                      purpose: "Issued when you leave a job" },
    ],
    refundsTypical: "Refunds possible if you worked part of the year — use HMRC online tool to claim.",
    treaties: ["Ghana–UK", "Nigeria–UK", "India–UK", "Pakistan–UK", "Bangladesh–UK", "Kenya–UK"],
    steps: [
      "Get a National Insurance Number once you arrive (apply online)",
      "Employer puts you on PAYE — tax deducted automatically",
      "Check your tax code — wrong code = wrong deduction",
      "Use HMRC app to view payslips, claim refund if overpaid",
    ],
    pitfalls: [
      "Emergency tax code (BR / 0T) = overpaying — fix it via HMRC asap",
      "Working off-the-books → loses NI credits + can void visa",
      "Side income on platforms (Uber, Etsy) triggers Self Assessment requirement",
    ],
    officialUrl: "https://gov.uk/log-in-file-self-assessment-tax-return",
  },
  de: {
    country: "de",
    system: "Finanzamt — Einkommensteuererklärung (income tax declaration)",
    deadline: "July 31 (next year) — extends to Feb if using a Steuerberater",
    year: "Jan 1 – Dec 31",
    filingRequired: "Optional for most students BUT highly recommended — average refund €1,000+ for international students.",
    forms: [
      { id: "ESt",      name: "Einkommensteuererklärung", purpose: "Main income tax return" },
      { id: "Anlage N", name: "Anlage N",                  purpose: "Employment income details" },
      { id: "Anlage S", name: "Anlage S",                  purpose: "Self-employment / freelance" },
      { id: "Anlage AUS", name: "Anlage AUS",              purpose: "Foreign income (scholarships from home)" },
    ],
    refundsTypical: "International students typically reclaim €800–€2,500 (tuition, moving costs, language courses).",
    treaties: ["Ghana–Germany", "India–Germany", "China–Germany", "Nigeria–Germany"],
    steps: [
      "Get a Steuer-ID — automatic 4–6 weeks after Anmeldung",
      "Use ELSTER online portal (free) or app like Taxfix / Wundertax (€35)",
      "Keep receipts: rent, transport, laptop, books, language courses",
      "Submit declaration — refund in 6–12 weeks",
    ],
    pitfalls: [
      "Missing Anmeldung delays your Steuer-ID = can't file",
      "Skipping declaration = leaving real money on the table",
      "Working > 120 full days as student = lose werkstudent status, full tax kicks in",
    ],
    officialUrl: "https://elster.de",
  },
  us: {
    country: "us",
    system: "IRS — non-resident vs resident filing matters",
    deadline: "April 15 (following year)",
    year: "Jan 1 – Dec 31",
    filingRequired: "All F-1/J-1 visa holders MUST file Form 8843 even with zero income.",
    forms: [
      { id: "8843",  name: "Form 8843",   purpose: "Statement for Exempt Individuals — required for ALL F/J visa holders" },
      { id: "1040NR",name: "Form 1040-NR", purpose: "Non-resident tax return (if you had US income)" },
      { id: "W-2",   name: "W-2",          purpose: "Wage statement from employer" },
      { id: "1098-T",name: "Form 1098-T",  purpose: "Tuition paid (university issues — limited use for non-residents)" },
    ],
    refundsTypical: "Possible if your wages exceeded standard deduction. Most non-residents get partial refund.",
    treaties: ["India–US", "China–US", "Germany–US", "UK–US"],
    steps: [
      "Apply for ITIN if no SSN (Form W-7)",
      "File Form 8843 every year, even with no income",
      "Use Sprintax (university often pays for you) — DO NOT use TurboTax (it files you as resident!)",
      "Mail returns to Austin, TX address — non-residents can't e-file in most cases",
    ],
    pitfalls: [
      "Filing as 'resident' on TurboTax can violate your visa — F-1 are non-residents for first 5 years",
      "Skipping Form 8843 = SEVIS / future visa issues",
      "Claiming standard deduction without tax treaty = IRS letter later",
    ],
    officialUrl: "https://irs.gov/individuals/international-taxpayers",
  },
};

export default function TaxPage() {
  const [country, setCountry] = useState<Country>("ca");
  const p = data[country];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <Link href="/toolkit" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to Toolkit
      </Link>

      <header className="mb-8 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-clay-500/15 text-clay-600 flex items-center justify-center shrink-0">
          <FileText size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900">Tax Filing Guide</h1>
          <p className="text-sm text-ink-600 mt-0.5">How international students should handle taxes — without getting fleeced or audited.</p>
        </div>
      </header>

      {/* Country tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.keys(labels) as Country[]).map((c) => (
          <button
            key={c}
            onClick={() => setCountry(c)}
            className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${
              country === c ? "bg-clay-500 text-white" : "bg-cream-100 text-ink-700 hover:bg-cream-200"
            }`}
          >
            <span className={`fi fi-${flags[c]}`} aria-hidden="true" />
            {labels[c]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2 space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink-900">{p.system}</h2>
            <p className="text-sm text-ink-600 mt-1">{p.filingRequired}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Mini label="Tax year" value={p.year} icon={<Calendar size={13} />} />
            <Mini label="Deadline" value={p.deadline} icon={<AlertTriangle size={13} />} />
          </div>

          <div className="rounded-md bg-leaf-500/10 border border-leaf-500/25 px-4 py-3 flex items-start gap-3">
            <Banknote size={16} className="text-leaf-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-leaf-600">Typical refunds</p>
              <p className="text-sm text-ink-700 mt-0.5">{p.refundsTypical}</p>
            </div>
          </div>
        </div>

        {/* Tax treaties sidebar */}
        <div className="card">
          <h3 className="font-display text-base font-semibold text-ink-900 mb-2">Tax treaty coverage</h3>
          <p className="text-xs text-ink-500 mb-3">If your origin country has a treaty, part of income may be exempt.</p>
          <ul className="space-y-1 text-sm text-ink-700">
            {p.treaties.map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-leaf-600" /> {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Forms */}
        <div className="card lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-3">Forms you&apos;ll see</h2>
          <ul className="divide-y divide-cream-200">
            {p.forms.map((f) => (
              <li key={f.id} className="py-3 flex items-start gap-3">
                <span className="badge badge-clay font-mono shrink-0">{f.id}</span>
                <div>
                  <p className="text-sm font-medium text-ink-900">{f.name}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{f.purpose}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        <div className="card lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-3">How to file — step by step</h2>
          <ol className="space-y-3">
            {p.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-clay-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">{i + 1}</span>
                <span className="text-sm text-ink-700 pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
          <a href={p.officialUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm text-clay-600 font-medium hover:underline">
            Official portal <ExternalLink size={11} />
          </a>
        </div>

        {/* Pitfalls */}
        <div className="card">
          <h3 className="font-display text-base font-semibold text-red-600 mb-2 flex items-center gap-1.5">
            <AlertTriangle size={14} /> Common pitfalls
          </h3>
          <ul className="space-y-2 text-xs text-ink-700">
            {p.pitfalls.map((p) => <li key={p}>• {p}</li>)}
          </ul>
        </div>
      </div>

      <p className="text-xs text-ink-500 mt-6">
        ⚠ Tax law changes yearly. This guide is community-maintained — always verify against official portals before filing.
      </p>
    </div>
  );
}

function Mini({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-md bg-cream-100 px-3 py-2.5">
      <p className="text-xs text-ink-500 flex items-center gap-1">{icon} {label}</p>
      <p className="text-sm font-medium text-ink-900 mt-0.5">{value}</p>
    </div>
  );
}
