"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Bell, Lock, Globe, Trash2, Moon, User, Check, Loader2, Camera, Users, X, Mail } from "lucide-react";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationToggle } from "@/components/pwa/NotificationToggle";
import { authFetch, getUser, logout, resetPassword } from "@/lib/auth";

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

function ProfileSection({ profile, setProfile }: { profile: Profile | null; setProfile: (p: Profile) => void }) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setBio(profile.bio ?? "");
    setCountry(profile.country_of_residence ?? "");
    setAvatarUrl(profile.avatar_url);
  }, [profile]);

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
        // avatar_url is z.string().optional() server-side, which accepts a
        // missing key but not an explicit null -- omit it entirely rather
        // than send null for the (typical) user who has no avatar set.
        body: JSON.stringify({
          full_name: fullName,
          bio,
          country_of_residence: country,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save");
      setProfile(data.user as Profile);
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
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" maxLength={255} />
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

type MentorProfile = {
  expertise_areas: string[] | null;
  languages_spoken: string[] | null;
  years_abroad: number | null;
  universities_attended: string[] | null;
  available_for_mentoring: boolean;
};

// Feeds the public mentor directory and the admin verification queue —
// without filling this in, a mentor shows up nowhere for students to find.
function MentorProfileSection() {
  const [expertise, setExpertise] = useState("");
  const [languages, setLanguages] = useState("");
  const [universities, setUniversities] = useState("");
  const [yearsAbroad, setYearsAbroad] = useState("");
  const [available, setAvailable] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await authFetch("/api/users/me/mentor-profile", { signal: ctrl.signal });
        const data = await res.json();
        const p = data.profile as MentorProfile | undefined;
        if (p) {
          setExpertise((p.expertise_areas ?? []).join(", "));
          setLanguages((p.languages_spoken ?? []).join(", "));
          setUniversities((p.universities_attended ?? []).join(", "));
          setYearsAbroad(p.years_abroad != null ? String(p.years_abroad) : "");
          setAvailable(p.available_for_mentoring ?? true);
        }
      } catch { /* leave fields blank */ } finally {
        setLoaded(true);
      }
    })();
    return () => ctrl.abort();
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setErr(null);
    try {
      const toList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
      const res = await authFetch("/api/users/me/mentor-profile", {
        method: "PATCH",
        body: JSON.stringify({
          expertise_areas: toList(expertise),
          languages_spoken: toList(languages),
          universities_attended: toList(universities),
          years_abroad: yearsAbroad ? Number(yearsAbroad) : undefined,
          available_for_mentoring: available,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="card flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-ink-400" />
      </div>
    );
  }

  return (
    <Section icon={<Users size={16} />} title="Mentor profile">
      <p className="text-xs text-ink-500 -mt-1">
        This is what students see in the mentor directory and what admins review to verify you.
      </p>
      {err && <p className="text-xs text-red-600">{err}</p>}

      <label className="block">
        <span className="block text-xs font-medium text-ink-600 mb-1.5">Expertise areas (comma-separated)</span>
        <input value={expertise} onChange={(e) => setExpertise(e.target.value)} className="input" placeholder="Visa applications, Scholarship essays" />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-ink-600 mb-1.5">Languages spoken (comma-separated)</span>
        <input value={languages} onChange={(e) => setLanguages(e.target.value)} className="input" placeholder="English, French" />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-ink-600 mb-1.5">Universities attended (comma-separated)</span>
        <input value={universities} onChange={(e) => setUniversities(e.target.value)} className="input" placeholder="University of Toronto" />
      </label>
      <label className="block max-w-[160px]">
        <span className="block text-xs font-medium text-ink-600 mb-1.5">Years abroad</span>
        <input type="number" min={0} max={80} value={yearsAbroad} onChange={(e) => setYearsAbroad(e.target.value)} className="input" />
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} className="accent-clay-500" />
        Available for mentoring
      </label>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-accent text-sm disabled:opacity-50">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Save mentor profile
        </button>
        {saved && <span className="text-xs text-leaf-600">Saved</span>}
      </div>
    </Section>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isMentor, setIsMentor] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetErr, setResetErr] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  useEffect(() => {
    // Starts false to match the server (no localStorage there); resolved
    // after mount so the mentor section doesn't cause a hydration mismatch.
    setIsMentor(getUser()?.role === "mentor");
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await authFetch("/api/auth/me", { signal: ctrl.signal });
        const data = await res.json();
        if (res.ok) setProfile(data.user as Profile);
      } catch { /* ProfileSection shows its own error state */ }
    })();
    return () => ctrl.abort();
  }, []);

  async function onUpdatePassword() {
    if (!profile) return;
    setResetErr(null);
    try {
      await resetPassword(profile.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 6000);
    } catch (e) {
      setResetErr(e instanceof Error ? e.message : "Couldn't send reset email");
    }
  }

  async function onDeleteAccount() {
    setDeleting(true);
    setDeleteErr(null);
    try {
      const res = await authFetch("/api/users/me", { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Couldn't delete account");
      await logout();
      router.push("/");
    } catch (e) {
      setDeleteErr(e instanceof Error ? e.message : "Couldn't delete account");
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-white">{t("settings.title")}</h1>
        <p className="text-sm text-ink-600 dark:text-gray-400 mt-1">{t("settings.account")}</p>
      </header>

      <div className="space-y-6">
        <ProfileSection profile={profile} setProfile={setProfile} />
        {isMentor && <MentorProfileSection />}

        <Section icon={<Bell size={16} />} title={t("settings.notifications")}>
          <p className="text-xs text-ink-500 -mt-1 mb-1">
            Push notifications (below) are the only delivery channel live right now — email and SMS delivery aren't built yet.
          </p>
          {/* Real browser push — the one notification channel that's actually wired end to end. */}
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
          <div className="flex items-center gap-3">
            <button onClick={onUpdatePassword} disabled={!profile} className="btn-ghost border border-cream-300 text-sm disabled:opacity-50">
              <Mail size={13} /> {t("settings.updatePassword")}
            </button>
            {resetSent && <span className="text-xs text-leaf-600">Reset link sent to {profile?.email}</span>}
          </div>
          {resetErr && <p className="text-xs text-red-600">{resetErr}</p>}
          <p className="text-xs text-ink-500">
            Two-factor authentication and session management aren&apos;t available yet.
          </p>
        </Section>

        <div className="card border-red-200 dark:border-red-900/40">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-red-600 mb-2">
            <Trash2 size={16} /> {t("settings.dangerZone")}
          </h2>
          <p className="text-sm text-ink-600 mb-4">
            {t("settings.deleteWarning")}
          </p>
          {!deleteOpen ? (
            <button
              onClick={() => setDeleteOpen(true)}
              className="px-4 py-2 rounded-md text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
            >
              {t("settings.deleteAccount")}
            </button>
          ) : (
            <div className="space-y-3">
              <label className="block">
                <span className="block text-xs font-medium text-ink-600 mb-1.5">
                  Type <span className="font-mono font-semibold">DELETE</span> to confirm — this permanently removes your account and all your data.
                </span>
                <input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="input max-w-xs"
                  placeholder="DELETE"
                />
              </label>
              {deleteErr && <p className="text-xs text-red-600">{deleteErr}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={onDeleteAccount}
                  disabled={deleteConfirm !== "DELETE" || deleting}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={13} className="animate-spin inline mr-1.5" /> : null}
                  Permanently delete my account
                </button>
                <button
                  onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); setDeleteErr(null); }}
                  className="btn-ghost border border-cream-300 text-sm"
                >
                  <X size={13} /> Cancel
                </button>
              </div>
            </div>
          )}
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
