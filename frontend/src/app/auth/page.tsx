"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import {
  ArrowRight, Mail, Lock, User, Globe, Eye, EyeOff, Loader2, Check, X,
  GraduationCap, Compass, Briefcase, ShieldCheck, Quote, BadgeCheck, Lock as LockIcon,
} from "lucide-react";
import { login, register, EmailNotVerifiedError, PASSWORD_POLICY } from "@/lib/auth";
import { roleHome } from "@/lib/roles";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTranslation } from "@/i18n/hooks/useTranslation";

function AuthContent() {
  const { t } = useTranslation();
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
      if (mode === "signup") {
        await register({ email, password, full_name: fullName, role, country_of_origin: origin });
        // Account created but locked until the email link is clicked.
        router.push("/verify-email");
        return;
      }
      await login(email, password);
      router.push(roleHome(signinRole || "student"));
      router.refresh();
    } catch (err) {
      if (err instanceof EmailNotVerifiedError) {
        router.push("/verify-email");
        return;
      }
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(mode === "signup" ? "signin" : "signup");
    setError("");
  }

  const roles = [
    { value: "student" as const, label: t("auth.roleStudent"), icon: GraduationCap },
    { value: "mentor" as const, label: t("auth.roleMentor"), icon: Compass },
    { value: "employer" as const, label: t("auth.roleEmployer"), icon: Briefcase },
  ];

  const stats = [
    { value: "120+", label: t("landing.statCountries") },
    { value: "50k+", label: t("landing.statStudents") },
    { value: "98%", label: t("landing.statVisaSuccess") },
  ];

  const isSignup = mode === "signup";

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-white dark:bg-gray-950">
      {/* ── Left: brand / trust panel ───────────────────────────── */}
      <aside className="relative hidden md:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0B1F3A] via-[#0A2540] to-[#06121F] text-white p-8 lg:p-12">
        {/* world-map dot motif */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1.4px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, black 40%, transparent 100%)",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-white shadow-lg">
              <Globe size={20} />
            </span>
            <span className="text-xl font-semibold tracking-tight">GlobalBridge</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            {t("auth.heroTitle")}
          </h2>
          <p className="mt-4 text-white/70 leading-relaxed">
            {t("auth.heroDescription")}
          </p>

          <dl className="mt-10 grid grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur-sm">
                <dt className="text-2xl font-bold text-emerald-400">{s.value}</dt>
                <dd className="mt-1 text-xs text-white/60">{s.label}</dd>
              </div>
            ))}
          </dl>

          <figure className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <Quote size={18} className="text-emerald-400" />
            <blockquote className="mt-2 text-sm text-white/85 leading-relaxed">
              &ldquo;{t("auth.testimonial")}&rdquo;
            </blockquote>
            <figcaption className="mt-3 text-xs text-white/60">
              {t("auth.testimonialAuthor")}
            </figcaption>
          </figure>
        </div>

        <div className="relative z-10 flex items-center gap-5 text-xs text-white/55">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-400" /> {t("auth.bankGradeSecurity")}</span>
          <span className="inline-flex items-center gap-1.5"><BadgeCheck size={14} className="text-emerald-400" /> {t("auth.verifiedListings")}</span>
        </div>
      </aside>

      {/* ── Right: form ─────────────────────────────────────────── */}
      <main className="flex flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-10">
          <Link href="/" className="md:hidden"><Logo /></Link>
          <span className="hidden md:block text-sm text-ink-500 dark:text-gray-400">
            {isSignup ? t("auth.alreadyHaveAccount") : t("auth.newToPlatform")}{" "}
            <button onClick={switchMode} className="font-semibold text-emerald-600 hover:text-emerald-700">
              {isSignup ? t("auth.signIn") : t("auth.createAccount")}
            </button>
          </span>
          <ThemeToggle />
        </header>

        <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-8 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <ShieldCheck size={13} /> {isSignup ? t("auth.createFreeAccount") : t("auth.secureSignIn")}
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#0A2540] dark:text-white">
                {isSignup ? t("auth.createAccount") : t("auth.welcomeBack")}
              </h1>
              <p className="mt-2 text-sm text-ink-500 dark:text-gray-400">
                {isSignup ? t("auth.signupSubtitle") : t("auth.signinSubtitle")}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400"
              >
                <X size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {isSignup && (
                <>
                  <Field label={t("auth.fullName")} htmlFor="full-name" icon={User}>
                    <input
                      id="full-name" type="text" required minLength={2}
                      value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className={inputCls} placeholder={t("auth.fullNamePlaceholder")} autoComplete="name"
                    />
                  </Field>

                  <fieldset>
                    <legend className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-gray-300">
                      {t("auth.iAmA")}
                    </legend>
                    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Account type">
                      {roles.map((r) => {
                        const selected = role === r.value;
                        return (
                          <button
                            type="button" key={r.value} role="radio" aria-checked={selected}
                            onClick={() => setRole(r.value)}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-medium transition-all ${
                              selected
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/30"
                                : "border-cream-200 dark:border-gray-700 text-ink-700 dark:text-gray-300 hover:border-emerald-300 hover:bg-cream-50 dark:hover:bg-gray-800"
                            }`}
                          >
                            <r.icon size={20} />
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <Field label={t("auth.countryOfOrigin")} htmlFor="origin" icon={Globe}>
                    <input
                      id="origin" type="text" required minLength={2}
                      value={origin} onChange={(e) => setOrigin(e.target.value)}
                      className={inputCls} placeholder={t("auth.countryPlaceholder")} autoComplete="country-name"
                    />
                  </Field>
                </>
              )}

              <Field label={t("auth.email")} htmlFor="email" icon={Mail}>
                <input
                  id="email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls} placeholder={t("auth.emailPlaceholder")} autoComplete="email"
                />
              </Field>

              {!isSignup && (
                <fieldset>
                  <legend className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-gray-300">
                    I am a
                  </legend>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Account type">
                    {roles.map((r) => {
                      const selected = signinRole === r.value;
                      return (
                        <button
                          type="button" key={r.value} role="radio" aria-checked={selected}
                          onClick={() => setSigninRole(r.value)}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-medium transition-all ${
                            selected
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/30"
                              : "border-cream-200 dark:border-gray-700 text-ink-700 dark:text-gray-300 hover:border-emerald-300 hover:bg-cream-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          <r.icon size={20} />
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-ink-700 dark:text-gray-300">
                    {t("auth.password")}
                  </label>
                  {!isSignup && (
                    <Link href="/forgot-password" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                      {t("auth.forgotPassword")}
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required minLength={isSignup ? PASSWORD_POLICY.minLength : undefined} maxLength={PASSWORD_POLICY.maxLength}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    className="w-full rounded-lg border border-cream-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-9 pr-10 text-sm text-ink-900 dark:text-white focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                    placeholder={isSignup ? t("auth.minChars") : t("auth.passwordPlaceholder")}
                  />
                  <button
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t("common.hide") : t("common.show")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600" tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {isSignup && <PasswordStrength password={password} />}
              </div>

              <button
                type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {loading ? t("common.loading") : isSignup ? t("auth.createAccount") : t("auth.signIn")}
              </button>

              <p className="flex items-center justify-center gap-1.5 text-xs text-ink-400 dark:text-gray-500">
                <LockIcon size={12} /> {t("auth.encryptedNotice")}
              </p>
            </form>

            <p className="mt-6 text-center text-sm text-ink-500 dark:text-gray-400 lg:hidden">
              {isSignup ? t("auth.alreadyHaveAccount") : t("auth.dontHaveAccount")}{" "}
              <button onClick={switchMode} className="font-semibold text-emerald-600 hover:text-emerald-700">
                {isSignup ? t("auth.signIn") : t("auth.createOne")}
              </button>
            </p>

            {isSignup && (
              <p className="mt-6 text-center text-xs leading-relaxed text-ink-400 dark:text-gray-500">
                {t("auth.agreeToTerms").split(/(\{terms\}|\{privacy\})/g).map((part, i) => {
                  if (part === "{terms}") {
                    return <Link key={i} href="/terms" className="underline hover:text-ink-600">{t("auth.terms")}</Link>;
                  }
                  if (part === "{privacy}") {
                    return <Link key={i} href="/privacy" className="underline hover:text-ink-600">{t("auth.privacyPolicy")}</Link>;
                  }
                  return <span key={i}>{part}</span>;
                })}.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-cream-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-ink-900 dark:text-white placeholder:text-ink-400 focus:border-transparent focus:ring-2 focus:ring-emerald-500";

function Field({
  label, htmlFor, icon: Icon, children,
}: {
  label: string; htmlFor: string; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        {children}
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const { t } = useTranslation();
  const checks = [
    { label: t("auth.passwordLength", { count: PASSWORD_POLICY.minLength }), pass: password.length >= PASSWORD_POLICY.minLength },
    { label: t("auth.passwordUppercase"), pass: /[A-Z]/.test(password) },
    { label: t("auth.passwordLowercase"), pass: /[a-z]/.test(password) },
    { label: t("auth.passwordNumber"), pass: /[0-9]/.test(password) },
    { label: t("auth.passwordSpecial"), pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const passed = checks.filter((c) => c.pass).length;
  const strength = passed <= 2 ? "weak" : passed <= 3 ? "medium" : "strong";
  const barColor: Record<string, string> = {
    weak: "bg-red-500", medium: "bg-amber-500", strong: "bg-emerald-500",
  };
  const strengthLabel = strength === "weak" ? t("auth.passwordWeak") : strength === "medium" ? t("auth.passwordMedium") : t("auth.passwordStrong");

  return (
    <div className="mt-3 space-y-2">
      <div className="flex h-1.5 gap-1">
        {["weak", "medium", "strong"].map((lvl, i) => (
          <div
            key={lvl}
            className={`h-full flex-1 rounded-full transition-colors ${
              passed > i ? barColor[strength] : "bg-cream-200 dark:bg-gray-700"
            }`}
          />
        ))}
      </div>
      {password && (
        <div className="text-xs capitalize text-ink-500 dark:text-gray-400">{strengthLabel}</div>
      )}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5 text-xs">
            {c.pass ? (
              <Check size={12} className="shrink-0 text-emerald-500" />
            ) : (
              <X size={12} className="shrink-0 text-ink-400" />
            )}
            <span className={c.pass ? "text-emerald-600 dark:text-emerald-400" : "text-ink-500 dark:text-gray-400"}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
