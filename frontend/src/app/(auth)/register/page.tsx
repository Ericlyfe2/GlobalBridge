"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, Lock, User, ArrowRight, GraduationCap, Globe, Briefcase } from "lucide-react";
import { register } from "@/lib/auth";

type Role = "student" | "mentor" | "employer";

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>("student");
  const [form, setForm] = useState({ full_name: "", email: "", password: "", country_of_origin: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role,
        country_of_origin: form.country_of_origin,
      });
      // Persist country (auth lib stores name/email/role/initials already)
      try { localStorage.setItem("user-country", form.country_of_origin); } catch {}

      const savedRole = localStorage.getItem("user-role");
      if (savedRole === "mentor") window.location.href = "/dashboard/mentor";
      else if (savedRole === "employer") window.location.href = "/dashboard/employer";
      else {
        const onboarded = typeof window !== "undefined" && localStorage.getItem("onboarded");
        window.location.href = onboarded ? "/dashboard" : "/onboarding";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  }

  const roles: { value: Role; label: string; icon: typeof GraduationCap; desc: string }[] = [
    { value: "student", label: "Student", icon: GraduationCap, desc: "Studying or planning to study abroad" },
    { value: "mentor", label: "Mentor / Immigrant", icon: Globe, desc: "Share your experience and guide others" },
    { value: "employer", label: "Employer", icon: Briefcase, desc: "Post jobs and internships for students" },
  ];

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-2 mb-6">
        <div className={`flex-1 h-1 rounded-full ${step >= 1 ? "bg-clay-500" : "bg-cream-200"}`} />
        <div className={`flex-1 h-1 rounded-full ${step >= 2 ? "bg-clay-500" : "bg-cream-200"}`} />
      </div>

      {step === 1 ? (
        <>
          <h1 className="text-3xl font-display font-semibold text-ink-900">I am a...</h1>
          <p className="mt-2 text-ink-600">Pick what fits best. You can change later.</p>

          <div className="mt-6 space-y-3">
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => setRole(r.value)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all flex items-start gap-4 ${
                  role === r.value
                    ? "border-clay-500 bg-clay-500/5"
                    : "border-cream-200 hover:border-cream-300"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  role === r.value ? "bg-clay-500 text-white" : "bg-cream-200 text-ink-600"
                }`}>
                  <r.icon size={18} />
                </div>
                <div>
                  <p className="font-medium text-ink-900">{r.label}</p>
                  <p className="text-sm text-ink-600 mt-0.5">{r.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <button onClick={() => setStep(2)} className="btn-accent w-full mt-8">
            Continue <ArrowRight size={16} />
          </button>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-display font-semibold text-ink-900">Create your account</h1>
          <p className="mt-2 text-ink-600">Few details and you&apos;re in.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Field
              icon={User}
              label="Full name"
              type="text"
              value={form.full_name}
              onChange={(v) => setForm({ ...form, full_name: v })}
              placeholder="Kwaku Adu Sarfo"
            />
            <Field
              icon={Mail}
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              placeholder="you@example.com"
            />
            <Field
              icon={Lock}
              label="Password"
              type="password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              placeholder="At least 8 characters"
            />
            <Field
              icon={Globe}
              label="Country of origin"
              type="text"
              value={form.country_of_origin}
              onChange={(v) => setForm({ ...form, country_of_origin: v })}
              placeholder="Ghana"
            />

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setStep(1)} className="btn-ghost border border-cream-300 flex-1">
                Back
              </button>
              <button type="submit" disabled={loading} className="btn-accent flex-[2] disabled:opacity-50">
                {loading ? "Creating..." : "Create account"} <ArrowRight size={16} />
              </button>
            </div>
            {error && (
              <div className="mt-3 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/25 text-sm text-red-600">
                {error}
              </div>
            )}
          </form>
        </>
      )}

      <p className="mt-8 text-center text-sm text-ink-600">
        Have an account?{" "}
        <Link href="/login" className="text-clay-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  icon: typeof Mail;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-700 mb-1.5">{label}</label>
      <div className="relative">
        <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
        <input
          type={type}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input pl-10"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
