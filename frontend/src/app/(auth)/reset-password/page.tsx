"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <div className="animate-fade-up text-center">
      <KeyRound size={24} className="mx-auto mb-3 text-clay-500" />
      <h1 className="text-3xl font-display font-semibold text-ink-900">Reset link sent</h1>
      <p className="mt-2 text-ink-600">
        Follow the password reset link in your email to choose a new password. The link opens a secure page hosted by our
        authentication provider.
      </p>
      <Link href="/login" className="btn-accent text-sm mt-6 inline-flex">
        Back to sign in
      </Link>
    </div>
  );
}
