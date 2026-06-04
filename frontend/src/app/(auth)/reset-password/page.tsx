"use client";

import Link from "next/link";
import { KeyRound, MailQuestion, Clock, ShieldCheck } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <div className="animate-fade-up">
      <div className="w-12 h-12 rounded-full bg-clay-500/15 text-clay-600 flex items-center justify-center mb-4">
        <KeyRound size={24} />
      </div>
      <h1 className="text-3xl font-display font-semibold text-ink-900">Check your email</h1>
      <p className="mt-2 text-ink-600">
        We&apos;ve sent a password reset link to your email. Click it to choose a new password.
      </p>

      <div className="mt-8 space-y-3">
        <div className="flex items-start gap-3 text-sm text-ink-600">
          <MailQuestion size={16} className="mt-0.5 shrink-0 text-clay-500" />
          <span>Can&apos;t find it? Check your spam folder.</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-ink-600">
          <Clock size={16} className="mt-0.5 shrink-0 text-clay-500" />
          <span>The link expires in 1 hour for security.</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-ink-600">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-clay-500" />
          <span>You&apos;ll be asked to verify your identity before resetting.</span>
        </div>
      </div>

      <Link href="/auth?mode=signin" className="btn-accent text-sm mt-8 inline-flex">
        Back to sign in
      </Link>
    </div>
  );
}
