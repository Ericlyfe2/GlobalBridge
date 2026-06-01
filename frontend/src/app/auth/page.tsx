"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { ArrowRight, Mail, Lock, User, Globe, Eye, EyeOff, Loader2, Check, X, GraduationCap, Compass, Briefcase } from "lucide-react";
import { login, register } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signup" | "signin">(
    searchParams.get("mode") === "signin" ? "signin" : "signup"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"student" | "mentor" | "employer">("student");
  const [signinRole, setSigninRole] = useState<"student" | "mentor" | "employer" | null>(null);
  const [origin, setOrigin] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let userRole = role;
      if (mode === "signup") {
        await register({ email, password, full_name: fullName, role, country_of_origin: origin });
      } else {
        await login(email, password);
        userRole = signinRole || "student";
      }
      const dashboards: Record<string, string> = {
        student: "/dashboard", mentor: "/dashboard/mentor", employer: "/dashboard/employer",
      };
      router.push(dashboards[userRole] || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(mode === "signup" ? "signin" : "signup");
    setError("");
  }

  const roles = [
    { value: "student" as const, label: "Student", icon: GraduationCap },
    { value: "mentor" as const, label: "Mentor", icon: Compass },
    { value: "employer" as const, label: "Employer", icon: Briefcase },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-cream-100 to-cream-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/"><Logo /></Link>
        <ThemeToggle />
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-ink-900 dark:text-white">
                {mode === "signup" ? "Create your account" : "Welcome back"}
              </h1>
              <p className="text-ink-500 dark:text-gray-400 mt-2 text-sm">
                {mode === "signup"
                  ? "Start your global education journey"
                  : "Sign in to continue your journey"}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 dark:text-gray-300 mb-1">
                      Full name
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                      <input
                        type="text"
                        required
                        minLength={2}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-cream-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-clay-500 focus:border-transparent text-sm"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-700 dark:text-gray-300 mb-1">
                      I am a
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {roles.map((r) => (
                        <button
                          type="button"
                          key={r.value}
                          onClick={() => setRole(r.value)}
                          className={`p-3 rounded-xl text-sm font-medium transition-all ${
                            role === r.value
                              ? "bg-clay-500 text-white shadow-lg scale-105"
                              : "bg-cream-100 dark:bg-gray-700 text-ink-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-gray-600"
                          }`}
                        >
                          <div className="mb-0.5 flex justify-center"><r.icon size={20} /></div>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-700 dark:text-gray-300 mb-1">
                      Country of origin
                    </label>
                    <div className="relative">
                      <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                      <input
                        type="text"
                        required
                        minLength={2}
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-cream-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-clay-500 focus:border-transparent text-sm"
                        placeholder="e.g. Ghana, Nigeria, India"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-gray-300 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-cream-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-clay-500 focus:border-transparent text-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {mode === "signin" && (
                <div>
                  <label className="block text-sm font-medium text-ink-700 dark:text-gray-300 mb-1">
                    I am a
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {roles.map((r) => (
                      <button
                        type="button"
                        key={r.value}
                        onClick={() => setSigninRole(r.value)}
                        className={`p-3 rounded-xl text-sm font-medium transition-all ${
                          signinRole === r.value
                            ? "bg-clay-500 text-white shadow-lg scale-105"
                            : "bg-cream-100 dark:bg-gray-700 text-ink-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-gray-600"
                        }`}
                      >
                        <div className="mb-0.5 flex justify-center"><r.icon size={20} /></div>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={mode === "signup" ? 8 : undefined}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 border border-cream-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-clay-500 focus:border-transparent text-sm"
                    placeholder={mode === "signup" ? "Minimum 8 characters" : "Your password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {mode === "signup" && (
                  <div className="mt-3 space-y-2">
                    {(() => {
                      const checks = [
                        { label: "At least 8 characters", pass: password.length >= 8 },
                        { label: "Uppercase letter", pass: /[A-Z]/.test(password) },
                        { label: "Lowercase letter", pass: /[a-z]/.test(password) },
                        { label: "A number", pass: /[0-9]/.test(password) },
                        { label: "Special character", pass: /[^A-Za-z0-9]/.test(password) },
                      ];
                      const passed = checks.filter((c) => c.pass).length;
                      const strength = passed <= 2 ? "weak" : passed <= 3 ? "medium" : "strong";
                      const colors: Record<string, string> = {
                        weak: "bg-red-500", medium: "bg-amber-500", strong: "bg-green-500",
                      };
                      return (
                        <>
                          <div className="flex gap-1 h-1.5">
                            {["weak", "medium", "strong"].map((lvl, i) => (
                              <div
                                key={lvl}
                                className={`h-full flex-1 rounded-full transition-colors ${
                                  passed > i ? colors[strength] : "bg-cream-200 dark:bg-gray-700"
                                }`}
                              />
                            ))}
                          </div>
                          <div className="text-xs text-ink-500 dark:text-gray-400 capitalize">
                            {password ? `${strength} password` : ""}
                          </div>
                          <div className="space-y-1">
                            {checks.map((c) => (
                              <div key={c.label} className="flex items-center gap-1.5 text-xs">
                                {c.pass ? (
                                  <Check size={12} className="text-green-500 shrink-0" />
                                ) : (
                                  <X size={12} className="text-ink-400 shrink-0" />
                                )}
                                <span className={c.pass ? "text-green-600 dark:text-green-400" : "text-ink-500 dark:text-gray-400"}>
                                  {c.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-clay-500 text-white py-2.5 rounded-lg font-semibold hover:bg-clay-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ArrowRight size={16} />
                )}
                {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-ink-500 dark:text-gray-400">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button onClick={switchMode} className="text-clay-600 hover:text-clay-700 font-medium">
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <button onClick={switchMode} className="text-clay-600 hover:text-clay-700 font-medium">
                    Create one
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-cream-50 dark:bg-gray-900">
        <Loader2 size={24} className="animate-spin text-clay-500" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
