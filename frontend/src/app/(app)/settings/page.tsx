"use client";

import { useState } from "react";
import { Bell, Lock, Globe, Trash2, Moon } from "lucide-react";

export default function SettingsPage() {
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [pushNotif, setPushNotif] = useState(true);
  const [language, setLanguage] = useState("en");

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-semibold text-ink-900">Settings</h1>
        <p className="text-sm text-ink-600 mt-1">Manage notifications, security, and account preferences.</p>
      </header>

      <div className="space-y-6">
        {/* Notifications */}
        <Section icon={<Bell size={16} />} title="Notifications">
          <Toggle label="Email notifications" sub="Application deadlines, mentor replies, verified opportunities." value={emailNotif} onChange={setEmailNotif} />
          <Toggle label="SMS alerts" sub="Critical reminders only (visa deadlines, scam alerts)." value={smsNotif} onChange={setSmsNotif} />
          <Toggle label="Browser push" sub="Real-time notifications when GlobalBridge is open." value={pushNotif} onChange={setPushNotif} />
        </Section>

        {/* Language */}
        <Section icon={<Globe size={16} />} title="Language">
          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">Display language</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input max-w-xs">
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="ar">العربية</option>
              <option value="zh">中文</option>
              <option value="hi">हिन्दी</option>
            </select>
            <p className="text-xs text-ink-500 mt-2">AI assistant responds in your selected language.</p>
          </label>
        </Section>

        {/* Appearance */}
        <Section icon={<Moon size={16} />} title="Appearance">
          <p className="text-sm text-ink-600">
            Use the moon/sun toggle in the top bar to switch theme. Preference is saved to this device.
          </p>
        </Section>

        {/* Security */}
        <Section icon={<Lock size={16} />} title="Security">
          <button className="btn-ghost border border-cream-300 text-sm">Change password</button>
          <button className="btn-ghost border border-cream-300 text-sm">Enable two-factor authentication</button>
          <button className="btn-ghost border border-cream-300 text-sm">Active sessions</button>
        </Section>

        {/* Danger zone */}
        <div className="card border-red-200 dark:border-red-900/40">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-red-600 mb-2">
            <Trash2 size={16} /> Danger zone
          </h2>
          <p className="text-sm text-ink-600 mb-4">
            Deleting your account removes your profile, messages, and applications. This cannot be undone.
          </p>
          <button className="px-4 py-2 rounded-md text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition">
            Delete account
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
