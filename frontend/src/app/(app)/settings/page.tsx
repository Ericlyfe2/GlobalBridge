"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Bell, Lock, Globe, Trash2, Moon, User, Check, Loader2, Camera } from "lucide-react";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationToggle } from "@/components/pwa/NotificationToggle";
import { authFetch } from "@/lib/auth";

type Profile = {
  id: string; email: string; full_name: string; avatar_url: string | null;
  country_of_residence: string | null; bio: string | null;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ProfileSection() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await authFetch("/api/auth/me", { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load profile");
        const p = data.user as Profile;
        setProfile(p);
        setFullName(p.full_name ?? "");
        setBio(p.bio ?? "");
        setCountry(p.country_of_residence ?? "");
        setAvatarUrl(p.avatar_url);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => ctrl.abort();
  }, []);

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const dataUrl = await fileToBase64(file);
      const res = await authFetch("/api/uploads", {
        method: "POST",
        body: JSON.stringify({ purpose: "avatar", filename: file.name, mime: file.type, data: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      setAvatarUrl(data.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setErr(null);
    try {
      const res = await authFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ full_name: fullName, bio, country_of_residence: country, avatar_url: avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!profile && !err) {
    return (
      <div className="card flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-ink-400" />
      </div>
    );
  }

  return (
    <Section icon={<User size={16} />} title={t("settings.profile")}>
      {err && <p className="text-xs text-red-600">{err}</p>}
      {profile && (
        <>
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" width={64} height={64} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-clay-500 to-clay-700 text-white flex items-center justify-center text-lg font-medium">
                  {profile.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-cream-200 dark:bg-gray-700 border border-cream-300 dark:border-gray-600 cursor-pointer hover:bg-cream-300">
                {uploading ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onAvatarChange} disabled={uploading} />
              </label>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-900 dark:text-white truncate">{profile.email}</p>
              <p className="text-xs text-ink-500">{t("settings.uploadPhoto")}</p>
            </div>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">{t("auth.fullName")}</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">Country of residence</span>
            <input value={country} onChange={(e) => setCountry(e.target.value)} className="input" placeholder="e.g. Canada" />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">Bio</span>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input min-h-[80px]" placeholder="A short line about yourself" />
          </label>

          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving} className="btn-accent text-sm disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {t("settings.saveChanges")}
            </button>
            {saved && <span className="text-xs text-leaf-600">{t("settings.changesSaved")}</span>}
          </div>
        </>
      )}
    </Section>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-white">{t("settings.title")}</h1>
        <p className="text-sm text-ink-600 dark:text-gray-400 mt-1">{t("settings.account")}</p>
      </header>

      <div className="space-y-6">
        <ProfileSection />

        <Section icon={<Bell size={16} />} title={t("settings.notifications")}>
          <Toggle label={t("settings.emailNotifications")} sub={t("notifications.types.deadline", { title: "" }).trim() || "Application deadlines, mentor replies, verified opportunities."} value={emailNotif} onChange={setEmailNotif} />
          <Toggle label={t("settings.smsNotifications")} sub="Critical reminders only (visa deadlines, scam alerts)." value={smsNotif} onChange={setSmsNotif} />
          {/* Real browser push, replacing a toggle that only set local state.
              This is the one place permission is ever requested, and only on
              an explicit click — see usePushNotifications. */}
          <NotificationToggle />
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
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900 dark:text-white mb-4">
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
        <p className="text-sm font-medium text-ink-900 dark:text-white">{label}</p>
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
