"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Sparkles, ArrowRight, ArrowLeft, GraduationCap, Globe, Languages, Target, Calendar, CheckCircle2,
} from "lucide-react";
import { FlagSelect } from "@/components/FlagSelect";

type Step = 1 | 2 | 3 | 4 | 5;

const totalSteps: Step = 5;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  const [origin, setOrigin]       = useState("GH");
  const [destination, setDest]    = useState("CA");
  const [goal, setGoal]           = useState<"study" | "work" | "exchange">("study");
  const [intake, setIntake]       = useState("2026-09");
  const [level, setLevel]         = useState("Masters");
  const [field, setField]         = useState("Computer Science");
  const [budget, setBudget]       = useState<"low" | "mid" | "high">("mid");
  const [language, setLanguage]   = useState("en");

  function next() {
    if (step < totalSteps) setStep((s) => (s + 1) as Step);
  }
  function back() {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }
  function finish() {
    try {
      localStorage.setItem("user-country", origin);
      localStorage.setItem("user-destination", destination);
      localStorage.setItem("user-goal", goal);
      localStorage.setItem("user-intake", intake);
      localStorage.setItem("user-level", level);
      localStorage.setItem("user-field", field);
      localStorage.setItem("user-budget", budget);
      localStorage.setItem("user-language", language);
      localStorage.setItem("onboarded", "1");
    } catch {}
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-cream-50">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition ${
                step >= i ? "bg-clay-500" : "bg-cream-200"
              }`}
            />
          ))}
        </div>

        <div className="card">
          {step === 1 && (
            <Step
              icon={<Sparkles className="text-clay-500" />}
              kicker="Step 1 of 5"
              title="Where are you coming from?"
              sub="So we can tailor your visa guidance + cultural community."
            >
              <FlagSelect
                value={origin}
                onChange={setOrigin}
                options={[
                  { value: "GH", label: "Ghana",      flag: "gh" },
                  { value: "NG", label: "Nigeria",    flag: "ng" },
                  { value: "KE", label: "Kenya",      flag: "ke" },
                  { value: "IN", label: "India",      flag: "in" },
                  { value: "PK", label: "Pakistan",   flag: "pk" },
                  { value: "BD", label: "Bangladesh", flag: "bd" },
                  { value: "CN", label: "China",      flag: "cn" },
                  { value: "EG", label: "Egypt",      flag: "eg" },
                  { value: "any", label: "Other" },
                ]}
              />
            </Step>
          )}

          {step === 2 && (
            <Step
              icon={<Globe className="text-sky-600" />}
              kicker="Step 2 of 5"
              title="Where do you want to go?"
              sub="Don't worry — you can save multiple destinations later."
            >
              <FlagSelect
                value={destination}
                onChange={setDest}
                options={[
                  { value: "CA", label: "Canada",         flag: "ca" },
                  { value: "UK", label: "United Kingdom", flag: "gb" },
                  { value: "US", label: "United States",  flag: "us" },
                  { value: "DE", label: "Germany",        flag: "de" },
                  { value: "AU", label: "Australia",      flag: "au" },
                  { value: "NL", label: "Netherlands",    flag: "nl" },
                  { value: "IE", label: "Ireland",        flag: "ie" },
                  { value: "any", label: "Not sure yet" },
                ]}
              />
            </Step>
          )}

          {step === 3 && (
            <Step
              icon={<Target className="text-amber-500" />}
              kicker="Step 3 of 5"
              title="What's the main goal?"
              sub="We'll surface the right opportunities and toolkit pages."
            >
              <div className="grid sm:grid-cols-3 gap-2">
                {(["study", "work", "exchange"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`p-4 rounded-lg border-2 text-left transition ${
                      goal === g
                        ? "border-clay-500 bg-clay-500/5"
                        : "border-cream-200 hover:border-cream-300"
                    }`}
                  >
                    <p className="font-medium text-ink-900 capitalize">{g}</p>
                    <p className="text-xs text-ink-500 mt-1">
                      {g === "study" && "Degree, semester, or short program"}
                      {g === "work" && "Job, internship, work permit"}
                      {g === "exchange" && "1–2 semester exchange"}
                    </p>
                  </button>
                ))}
              </div>
            </Step>
          )}

          {step === 4 && (
            <Step
              icon={<GraduationCap className="text-leaf-600" />}
              kicker="Step 4 of 5"
              title="Tell us about your study"
              sub="Used to filter scholarships, programs, and mentor matching."
            >
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-medium text-ink-600 mb-1.5">Level</span>
                  <select value={level} onChange={(e) => setLevel(e.target.value)} className="input">
                    <option>Undergraduate</option>
                    <option>Masters</option>
                    <option>PhD</option>
                    <option>Diploma / Certificate</option>
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-ink-600 mb-1.5">Field of study</span>
                  <input value={field} onChange={(e) => setField(e.target.value)} className="input" placeholder="e.g. Computer Science" />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-ink-600 mb-1.5 flex items-center gap-1">
                    <Calendar size={11} /> Target intake
                  </span>
                  <input type="month" value={intake} onChange={(e) => setIntake(e.target.value)} className="input" />
                </label>
                <div>
                  <span className="block text-xs font-medium text-ink-600 mb-1.5">Budget</span>
                  <div className="flex gap-2">
                    {(["low", "mid", "high"] as const).map((b) => (
                      <button
                        key={b}
                        onClick={() => setBudget(b)}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition ${
                          budget === b ? "bg-clay-500 text-white border-clay-500" : "bg-cream-100 text-ink-700 border-cream-200"
                        }`}
                      >
                        {b === "low" && "Need full ride"}
                        {b === "mid" && "Partial scholarship"}
                        {b === "high" && "Self-fund OK"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Step>
          )}

          {step === 5 && (
            <Step
              icon={<Languages className="text-clay-500" />}
              kicker="Step 5 of 5"
              title="What language do you prefer?"
              sub="The AI assistant will use this language. UI text comes from bundled translations (14 locales)."
            >
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input">
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="ar">العربية</option>
                <option value="zh">中文</option>
                <option value="hi">हिन्दी</option>
                <option value="sw">Kiswahili</option>
                <option value="pt">Português</option>
              </select>

              <div className="mt-5 p-4 rounded-md bg-leaf-500/10 border border-leaf-500/25 flex items-start gap-3">
                <CheckCircle2 size={16} className="text-leaf-600 mt-0.5 shrink-0" />
                <div className="text-sm text-ink-700">
                  All set. We&apos;ve already lined up {origin} → {destination} mentors and {goal} opportunities for you.
                </div>
              </div>
            </Step>
          )}

          {/* Footer */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              onClick={back}
              disabled={step === 1}
              className="btn-ghost border border-cream-300 text-sm disabled:opacity-30"
            >
              <ArrowLeft size={13} /> Back
            </button>
            <p className="text-xs text-ink-500">Skip with <button onClick={() => router.push("/dashboard")} className="text-clay-600 font-medium hover:underline">→ Take me to dashboard</button></p>
            {step < totalSteps ? (
              <button onClick={next} className="btn-accent text-sm">
                Continue <ArrowRight size={13} />
              </button>
            ) : (
              <button onClick={finish} className="btn-accent text-sm">
                Finish <CheckCircle2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ icon, kicker, title, sub, children }: { icon: React.ReactNode; kicker: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <>
      <p className="text-xs uppercase tracking-wider text-clay-600 mb-2">{kicker}</p>
      <h1 className="text-2xl font-display font-semibold text-ink-900 flex items-center gap-2">
        {icon} {title}
      </h1>
      <p className="text-sm text-ink-600 mt-2 mb-6">{sub}</p>
      <div>{children}</div>
    </>
  );
}
