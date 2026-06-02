"use client";

import Link from "next/link";
import { MailCheck } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="animate-fade-up text-center">
      <MailCheck size={24} className="mx-auto mb-3 text-clay-500" />
      <h1 className="text-3xl font-display font-semibold text-ink-900">Check your email</h1>
      <p className="mt-2 text-ink-600">
        We&apos;ve sent a verification link to your inbox. Open it to confirm your address, then return here.
      </p>
      <Link href="/dashboard" className="btn-accent text-sm mt-6 inline-flex">
        Go to dashboard
      </Link>
    </div>
  );
}
