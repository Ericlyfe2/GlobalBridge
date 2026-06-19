"use client";

import { useState } from "react";
import { Bell, Lock, Globe, Trash2, Moon } from "lucide-react";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function SettingsPage() {
  const { t, lang, setLang } = useTranslation();
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [pushNotif, setPushNotif] = useState(true);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-semibold text-ink-900">{t("settings.title")}</h1>
        <p className="text-sm text-ink-600 mt-1">{t("settings.account")}</p>
      </header>

      <div className="space-y-6">
        <Section icon={<Bell size={16} />} title={t("settings.notifications")}>
          <Toggle label={t("settings.emailNotifications")} sub={t("notifications.types.deadline", { title: "" }).trim() || "Application deadlines, mentor replies, verified opportunities."} value={emailNotif} onChange={setEmailNotif} />
          <Toggle label={t("settings.smsNotifications")} sub="Critical reminders only (visa deadlines, scam alerts)." value={smsNotif} onChange={setSmsNotif} />
          <Toggle label={t("settings.pushNotifications")} sub="Real-time notifications when GlobalBridge is open." value={pushNotif} onChange={setPushNotif} />
        </Section>

        <Section icon={<Globe size={16} />} title={t("settings.languageLabel")}>
          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">{t("common.language")}</span>
            <LanguageSwitcher variant="full" />
            <p className="text-xs text-ink-500 mt-2">{t("settings.languageDescription")}</p>
          </label>
        </Section>

        <Section icon={<Moon size={16} />} title={t("settings.appearance")}>
          <p className="text-sm text-ink-600">
            {t("settings.themeDescription")}
          </p>
        </Section>

        <Section icon={<Lock size={16} />} title={t("settings.security")}>
          <button className="btn-ghost border border-cream-300 text-sm">{t("settings.updatePassword")}</button>
          <button className="btn-ghost border border-cream-300 text-sm">{t("settings.enableTwoFactor") || "Enable two-factor authentication"}</button>
          <button className="btn-ghost border border-cream-300 text-sm">{t("settings.sessions")}</button>
        </Section>

        <div className="card border-red-200 dark:border-red-900/40">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-red-600 mb-2">
            <Trash2 size={16} /> {t("settings.dangerZone")}
          </h2>
          <p className="text-sm text-ink-600 mb-4">
            {t("settings.deleteWarning")}
          </p>
          <button className="px-4 py-2 rounded-md text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition">
            {t("settings.deleteAccount")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900 mb-4">
        <span className="text-clay-500">{icon}</span> {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Toggle({
  label, sub, value, onChange,
}: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-ink-900">{label}</p>
        {sub && <p className="text-xs text-ink-500 mt-0.5">{sub}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${value ? "bg-clay-500" : "bg-cream-300"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? "left-5" : "left-0.5"}`} />
      </button>
    </div>
  );
}
