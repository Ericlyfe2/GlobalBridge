"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, Timer } from "lucide-react";
import { resetPassword } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  function startCooldown(seconds = 60) {
    setCooldown(seconds);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      await resetPassword(email);
      setSent(true);
      // Security: show the same success even if Firebase returns
      // "user-not-found" to prevent email enumeration.
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("too-many-requests") || msg.toLowerCase().includes("too many")) {
        setError("Too many requests. Please wait a minute before trying again.");
        startCooldown(60);
      } else {
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="animate-fade-up">
        <div className="w-12 h-12 rounded-full bg-leaf-500/15 text-leaf-600 flex items-center justify-center mb-4">
          <CheckCircle2 size={24} />
        </div>
        <h1 className="text-3xl font-display font-semibold text-ink-900">Check your inbox</h1>
        <p className="mt-2 text-ink-600">
          If an account exists for <span className="font-medium text-ink-900">{email}</span>, we&apos;ve sent a password
          reset link. It expires in 1 hour.
        </p>
        <p className="mt-4 text-sm text-ink-500">
          Didn&apos;t get it? Check spam, or{" "}
          <button onClick={() => { setSent(false); setCooldown(30); startCooldown(30); }} className="text-clay-600 font-medium hover:underline">try again</button>.
        </p>
        <Link href="/auth?mode=signin" className="btn-ghost border border-cream-300 text-sm mt-8 inline-flex">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-display font-semibold text-ink-900">Reset your password</h1>
      <p className="mt-2 text-ink-600">Enter your email and we&apos;ll send you a reset link.</p>

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-10"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || cooldown > 0}
          className="btn-accent w-full disabled:opacity-50"
        >
          {loading ? (
            "Sending..."
          ) : cooldown > 0 ? (
            <span className="inline-flex items-center gap-1.5"><Timer size={14} /> Retry in {cooldown}s</span>
          ) : (
            <>Send reset link <ArrowRight size={16} /></>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-600">
        Remembered it?{" "}
        <Link href="/auth?mode=signin" className="text-clay-600 font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
