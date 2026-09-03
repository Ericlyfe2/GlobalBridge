"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import {
  ArrowRight, Mail, Lock, User, Globe, Eye, EyeOff, Loader2, Check, X,
  GraduationCap, Compass, Briefcase, ShieldCheck, Quote, BadgeCheck, Lock as LockIcon,
} from "lucide-react";
import { login, register, loginWithGoogle, PASSWORD_POLICY, validatePassword } from "@/lib/auth";
import { roleHome } from "@/lib/roles";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { AtlasPortrait } from "@/components/mascot/AtlasPortrait";
import AuthVideo from "@/components/AuthVideo";
import Lightfall from "@/components/Lightfall";

function AuthContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signup" | "signin">(
    searchParams.get("mode") === "signin" ? "signin" : "signup"
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"student" | "mentor" | "employer">("student");
  const [origin, setOrigin] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "signup") {
      // The PasswordStrength checklist below is only a visual hint — nothing
      // upstream of this actually enforced it. Firebase's own minimum is just
      // 6 characters, so without this check any password meeting only the
      // HTML `minLength` attribute (length alone) would sail through signup.
      const passwordErrors = validatePassword(password);
      if (passwordErrors.length > 0) {
        setError(`Password needs: ${passwordErrors.join(", ")}`);
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        await register({ email, password, full_name: fullName, role, country_of_origin: origin });
      } else {
        await login(email, password);
      }
      // Route by the role the account actually has, not one picked at the
      // login form — that's the whole point of accounts having a role.
      const { getUser: getStoredUser } = await import("@/lib/auth");
      const storedUser = getStoredUser();
      router.push(roleHome(storedUser?.role ?? "student"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(mode === "signup" ? "signin" : "signup");
    setError("");
  }

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      const { getUser: getStoredUser } = await import("@/lib/auth");
      const storedUser = getStoredUser();
      router.push(roleHome(storedUser?.role || "student"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setGoogleLoading(false);
    }
  }

  const roles = [
    { value: "student" as const, label: t("auth.roleStudent"), icon: GraduationCap },
    { value: "mentor" as const, label: t("auth.roleMentor"), icon: Compass },
    { value: "employer" as const, label: t("auth.roleEmployer"), icon: Briefcase },
  ];

  const isSignup = mode === "signup";
  // Hiring managers aren't on the same journey as a student picking a visa
  // pathway — the pitch, not the data model, should say so.
  const employerMode = isSignup && role === "employer";
  // Sign-in has no role picker (removed — it never actually controlled
  // routing), so it always gets the student-flavoured pitch.
  const activeRole = isSignup ? role : "student";

  const ROLE_STATS: Record<typeof role, { value: string; label: string }[]> = {
    student: [
      { value: "120+", label: t("landing.statCountries") },
      { value: "50k+", label: t("landing.statStudents") },
      { value: "98%", label: t("landing.statVisaSuccess") },
    ],
    mentor: [
      { value: "500+", label: "Active mentors" },
      { value: "12k+", label: "Sessions completed" },
      { value: "4.9★", label: "Average rating" },
    ],
    employer: [
      { value: "300+", label: "Companies hiring" },
      { value: "50k+", label: "Verified candidates" },
      { value: "98%", label: "Visa-ready talent" },
    ],
  };
  const stats = ROLE_STATS[activeRole];

  const ROLE_TESTIMONIALS: Record<typeof role, { quote: string; author: string }[]> = {
    student: [
      {
        quote: "GlobalBridge walked me through my entire student visa and helped me find safe housing before I even landed. It felt like having a guide in every country.",
        author: "Ama O. — Student from Ghana 🇬🇭",
      },
      {
        quote: "I compared three countries side by side before deciding — the comparison tool alone probably saved me a whole semester of confusion.",
        author: "Daniel K. — Student from Nigeria 🇳🇬",
      },
      {
        quote: "The document checker caught a name-format mismatch on my passport that would've gotten my application rejected. Small thing, huge relief.",
        author: "Mei L. — Student from Vietnam 🇻🇳",
      },
    ],
    mentor: [
      {
        quote: "Mentoring on GlobalBridge takes ten minutes to set up and the matching is genuinely good — I only get students I can actually help.",
        author: "Kwame B. — Mentor since 2025",
      },
      {
        quote: "I've guided six students through their visa process this year. The platform handles scheduling so I can focus on the actual advice.",
        author: "Fatima R. — Immigration mentor",
      },
    ],
    employer: [
      {
        quote: "We had three sponsorship-ready engineers shortlisted within a month — all pre-verified before we scheduled a single call.",
        author: "Talent Lead, remote-first startup",
      },
      {
        quote: "Every candidate came pre-verified with real transcripts and confirmed visa status. Cut our screening time in half.",
        author: "Hiring Manager, mid-size tech company",
      },
    ],
  };
  const testimonials = ROLE_TESTIMONIALS[activeRole];

  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [testimonialVisible, setTestimonialVisible] = useState(true);

  // Switching role should jump straight to that role's pitch, not linger on
  // the outgoing one until the next rotation tick.
  useEffect(() => {
    setTestimonialIdx(0);
    setTestimonialVisible(true);
  }, [activeRole]);

  // Rotates to a different (never the same twice in a row) testimonial from
  // the active role's pool every few seconds, with a brief fade between them.
  useEffect(() => {
    if (testimonials.length <= 1) return;
    const interval = setInterval(() => {
      setTestimonialVisible(false);
      setTimeout(() => {
        setTestimonialIdx((prev) => {
          if (testimonials.length <= 1) return prev;
          let next = prev;
          while (next === prev) next = Math.floor(Math.random() * testimonials.length);
          return next;
        });
        setTestimonialVisible(true);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length, activeRole]);

  const activeTestimonial = testimonials[testimonialIdx] ?? testimonials[0];

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-white dark:bg-[var(--color-surface)] dark:bg-gray-950">
      {/* ── Left: brand / trust panel ───────────────────────────── */}
      <aside className="relative hidden md:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0B1F3A] via-[#0A2540] to-[#06121F] text-white p-8 lg:p-12">
        {/* Real footage (a public airport concourse), not a stock illustration —
            fits the "your move, held together" positioning better than a flat
            gradient. Network-aware: see AuthVideo for the Save-Data / 2G /
            reduced-motion rules that fall back to a static poster frame. */}
        <AuthVideo />
        {/* Darkening scrim so white text stays legible over the footage. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-[#0B1F3A]/90 via-[#0A2540]/85 to-[#06121F]/90" />
        {/* world-map dot motif */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1.4px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, black 40%, transparent 100%)",
          }}
        />
        <div aria-hidden className={`pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full blur-3xl ${employerMode ? "bg-amber-500/20" : "bg-emerald-500/20"}`} />
        <div aria-hidden className={`pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full blur-3xl ${employerMode ? "bg-slate-400/20" : "bg-blue-500/20"}`} />

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
            {employerMode ? "Hire the talent moving the world forward." : t("auth.heroTitle")}
          </h2>
          <p className="mt-4 text-white/70 leading-relaxed">
            {employerMode
              ? "Post roles and reach visa-ready candidates with verified credentials — no sifting through unverifiable resumes."
              : t("auth.heroDescription")}
          </p>

          <dl className="mt-10 grid grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur-sm">
                <dt className={`text-2xl font-bold transition-colors ${employerMode ? "text-amber-400" : "text-emerald-400"}`}>{s.value}</dt>
                <dd className="mt-1 text-xs text-white/60">{s.label}</dd>
              </div>
            ))}
          </dl>

          <figure
            className={`mt-8 min-h-[148px] rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-opacity duration-300 ${
              testimonialVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <Quote size={18} className={employerMode ? "text-amber-400" : "text-emerald-400"} />
            <blockquote className="mt-2 text-sm text-white/85 leading-relaxed">
              &ldquo;{activeTestimonial.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-3 text-xs text-white/60">
              {activeTestimonial.author}
            </figcaption>
          </figure>
        </div>

        <div className="relative z-10 flex items-center gap-5 text-xs text-white/55">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-400" /> {t("auth.bankGradeSecurity")}</span>
          <span className="inline-flex items-center gap-1.5"><BadgeCheck size={14} className="text-emerald-400" /> {t("auth.verifiedListings")}</span>
        </div>
      </aside>

      {/* ── Right: form ─────────────────────────────────────────── */}
      <main className="relative flex flex-col overflow-hidden">
        {/* Ambient WebGL background (React Bits' Lightfall, ported to TS) —
            kept subtle (low opacity) so it reads as texture behind the card
            rather than competing with it, and skips entirely under
            prefers-reduced-motion (see Lightfall.tsx). */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
          <Lightfall
            colors={["#14b8a6", "#5eead4", "#0d9488"]}
            backgroundColor="#0a2540"
            speed={0.3}
            streakCount={3}
            streakWidth={0.7}
            streakLength={1.1}
            glow={0.4}
            density={0.3}
            twinkle={0.3}
            zoom={3}
            backgroundGlow={0.12}
            opacity={0.22}
            mouseInteraction
            mouseStrength={0.2}
            mouseRadius={0.8}
          />
        </div>

        <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
          <Link href="/" className="md:hidden"><Logo /></Link>
          <span className="hidden md:block text-sm text-ink-500 dark:text-gray-400">
            {isSignup ? t("auth.alreadyHaveAccount") : t("auth.newToPlatform")}{" "}
            <button onClick={switchMode} className="font-semibold text-clay-600 hover:text-clay-700">
              {isSignup ? t("auth.signIn") : t("auth.createAccount")}
            </button>
          </span>
          <ThemeToggle />
        </header>

        <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-8 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              {employerMode ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Briefcase size={13} /> Employer account
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-clay-500/10 px-3 py-1 text-xs font-medium text-clay-700 dark:text-clay-400">
                  <ShieldCheck size={13} /> {isSignup ? t("auth.createFreeAccount") : t("auth.secureSignIn")}
                </span>
              )}
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#0A2540] dark:text-white">
                {isSignup ? t("auth.createAccount") : t("auth.welcomeBack")}
              </h1>
              <p className="mt-2 text-sm text-ink-500 dark:text-gray-400">
                {employerMode
                  ? "Set up your hiring account and start reaching verified candidates in minutes."
                  : isSignup ? t("auth.signupSubtitle") : t("auth.signinSubtitle")}
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

            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading || loading}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-cream-200 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] dark:bg-gray-800 py-2.5 text-sm font-semibold text-ink-700 dark:text-gray-200 shadow-sm transition-colors hover:bg-cream-50 dark:hover:bg-gray-750 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <GoogleIcon size={16} />
              )}
              {googleLoading ? t("common.loading") : t("auth.continueWithGoogle")}
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-cream-200 dark:bg-gray-700" />
              <span className="text-xs font-medium text-ink-400 dark:text-gray-500">{t("auth.orDivider")}</span>
              <div className="h-px flex-1 bg-cream-200 dark:bg-gray-700" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {isSignup && (
                <>
                  <Field label={employerMode ? "Your name" : t("auth.fullName")} htmlFor="full-name" icon={User}>
                    <input
                      id="full-name" type="text" required minLength={2}
                      value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className={inputCls}
                      placeholder={employerMode ? "e.g. Amara Chen" : t("auth.fullNamePlaceholder")}
                      autoComplete="name"
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
                                ? "border-clay-500 bg-clay-500/10 text-clay-700 dark:text-clay-400 ring-2 ring-clay-500/30"
                                : "border-cream-200 dark:border-gray-700 text-ink-700 dark:text-gray-300 hover:border-clay-300 hover:bg-cream-50 dark:hover:bg-gray-800"
                            }`}
                          >
                            <r.icon size={20} />
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                    {employerMode && (
                      <p className="mt-2 text-xs text-ink-400 dark:text-gray-500">
                        You&apos;ll add your company profile right after signing up.
                      </p>
                    )}
                  </fieldset>

                  <Field label={employerMode ? "Where you're hiring from" : t("auth.countryOfOrigin")} htmlFor="origin" icon={Globe}>
                    <input
                      id="origin" type="text" required minLength={2}
                      value={origin} onChange={(e) => setOrigin(e.target.value)}
                      className={inputCls}
                      placeholder={employerMode ? "e.g. United States" : t("auth.countryPlaceholder")}
                      autoComplete="country-name"
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

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-ink-700 dark:text-gray-300">
                    {t("auth.password")}
                  </label>
                  {!isSignup && (
                    <Link href="/forgot-password" className="text-xs font-medium text-clay-600 hover:text-clay-700">
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
                    className="w-full rounded-lg border border-cream-200 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] dark:bg-gray-800 py-2.5 pl-9 pr-10 text-sm text-ink-900 dark:text-white focus:border-transparent focus:ring-2 focus:ring-clay-500"
                    placeholder={isSignup ? t("auth.minChars") : t("auth.passwordPlaceholder")}
                  />
                  <button
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t("common.hide") : t("common.show")}
                    className="absolute right-1 top-1/2 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center text-ink-400 hover:text-ink-600" tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {isSignup && <PasswordStrength password={password} />}
              </div>

              <button
                type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-clay-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50"
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
              <button onClick={switchMode} className="font-semibold text-clay-600 hover:text-clay-700">
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

            {/* Atlas here is decorative + a static tip, not the live event-driven
                dock (that only lives inside the signed-in app shell). The
                advice itself is real, evergreen platform guidance — not
                fabricated per-session content. */}
            <div className="mt-8 flex items-start gap-3">
              <AtlasPortrait size={40} className="shrink-0" />
              <div className="rounded-2xl rounded-tl-sm border border-cream-200 dark:border-gray-700 bg-cream-50 dark:bg-gray-800/60 px-3.5 py-2.5">
                <p className="flex items-center gap-1 text-xs font-semibold text-leaf-600">
                  <ShieldCheck size={12} /> {t("auth.securityTipTitle")}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-600 dark:text-gray-400">
                  {t("auth.securityTipBody")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Official Google "G" mark — brand guidelines require the four-colour glyph, not a recolour. */
function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.9 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 34.9 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.9 39.7 16.4 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.6 36 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z"/>
    </svg>
  );
}

const inputCls =
  "w-full rounded-lg border border-cream-200 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] dark:bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-ink-900 dark:text-white placeholder:text-ink-400 focus:border-transparent focus:ring-2 focus:ring-clay-500";

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
    weak: "bg-red-500", medium: "bg-amber-500", strong: "bg-leaf-500",
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
              <Check size={12} className="shrink-0 text-leaf-500" />
            ) : (
              <X size={12} className="shrink-0 text-ink-400" />
            )}
            <span className={c.pass ? "text-leaf-600 dark:text-leaf-400" : "text-ink-500 dark:text-gray-400"}>
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
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[var(--color-surface)] dark:bg-gray-950">
        <Loader2 size={24} className="animate-spin text-clay-500" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
