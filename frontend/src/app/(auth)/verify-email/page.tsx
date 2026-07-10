"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MailCheck, RefreshCw, ArrowRight, Loader2 } from "lucide-react";
import {
  completeVerification,
  getPendingVerificationEmail,
  resendVerificationEmail,
} from "@/lib/auth";
import { roleHome } from "@/lib/roles";
import { useTranslation } from "@/i18n/hooks/useTranslation";

const RESEND_COOLDOWN_S = 30;

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const router = useRouter();

  // Firebase restores the session asynchronously after load, so poll briefly
  // before concluding there is no pending account on this device.
  const [email, setEmail] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  useEffect(() => {
    let tries = 0;
    const id = setInterval(() => {
      const e = getPendingVerificationEmail();
      if (e) {
        setEmail(e);
        setResolved(true);
        clearInterval(id);
      } else if (++tries >= 10) {
        setResolved(true);
        clearInterval(id);
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);
  const [error, setError] = useState("");

  async function handleContinue() {
    setChecking(true);
    setNotYet(false);
    setError("");
    try {
      const user = await completeVerification();
      if (user) {
        router.push(roleHome(user.role));
        router.refresh();
      } else {
        setNotYet(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setChecking(false);
    }
  }

  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function handleResend() {
    setError("");
    setResent(false);
    try {
      await resendVerificationEmail();
      setResent(true);
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  if (!resolved) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={22} className="animate-spin text-clay-500" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="animate-fade-up text-center">
        <MailCheck size={24} className="mx-auto mb-3 text-clay-500" />
        <h1 className="text-3xl font-display font-semibold text-ink-900">{t("auth.verifyTitle")}</h1>
        <p className="mt-2 text-ink-600">{t("auth.verifyNoPending")}</p>
        <Link href="/auth?mode=signin" className="btn-accent text-sm mt-6 inline-flex">
          {t("auth.verifyBackToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up text-center">
      <MailCheck size={24} className="mx-auto mb-3 text-clay-500" />
      <h1 className="text-3xl font-display font-semibold text-ink-900">{t("auth.verifyTitle")}</h1>
      <p className="mt-2 text-ink-600">
        {t("auth.verifySentTo")}{" "}
        <span className="font-medium text-ink-900 break-all">{email}</span>
      </p>
      <p className="mt-2 text-sm text-ink-500">{t("auth.verifyBody")}</p>

      {notYet && (
        <p role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {t("auth.verifyNotYet")}
        </p>
      )}
      {resent && (
        <p role="status" className="mt-4 rounded-lg border border-leaf-500/30 bg-leaf-500/10 px-3 py-2 text-sm text-leaf-600">
          {t("auth.verifyResent")}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          onClick={handleContinue}
          disabled={checking}
          className="btn-accent text-sm inline-flex items-center gap-2 disabled:opacity-60"
        >
          {checking ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          {t("auth.verifyContinue")}
        </button>
        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          className="btn-ghost text-sm inline-flex items-center gap-2 border border-cream-300 disabled:opacity-50"
        >
          <RefreshCw size={13} />
          {cooldown > 0 ? t("auth.verifyResendWait", { seconds: cooldown }) : t("auth.verifyResend")}
        </button>
      </div>
    </div>
  );
}
