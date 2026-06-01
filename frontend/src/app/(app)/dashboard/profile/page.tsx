"use client";

import { useEffect, useRef, useState } from "react";
import { User, Globe, GraduationCap, Languages, Camera, Save, Loader2 } from "lucide-react";
import { authFetch, getToken } from "@/lib/auth";
import { uploadFile } from "@/lib/upload";

export default function ProfilePage() {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarInput = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [origin, setOrigin] = useState("Ghana");
  const [destination, setDestination] = useState("Canada");
  const [level, setLevel] = useState("Undergraduate (Year 3)");
  const [field, setField] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");

  // Prefill from localStorage (set during register / onboarding)
  useEffect(() => {
    try {
      setFullName(localStorage.getItem("user-name") || "");
      setEmail(localStorage.getItem("user-email") || "");
      setOrigin(localStorage.getItem("user-country") || "Ghana");
      setDestination(localStorage.getItem("user-destination") || "Canada");
      setField(localStorage.getItem("user-field") || "");
      setAvatarUrl(localStorage.getItem("user-avatar"));
    } catch { /* ignore */ }
  }, []);

  async function onAvatar(file: File | undefined) {
    if (!file) return;
    if (!getToken()) { setErr("Sign in to change your photo."); return; }
    setErr(null);
    setAvatarBusy(true);
    try {
      const { url } = await uploadFile(file, "avatar");
      await authFetch("/api/users/me", { method: "PATCH", body: JSON.stringify({ avatar_url: url }) });
      setAvatarUrl(url);
      try { localStorage.setItem("user-avatar", url); } catch { /* ignore */ }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setAvatarBusy(false);
    }
  }

  const initials = fullName.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "G";

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);

    // Mirror to localStorage immediately
    try {
      localStorage.setItem("user-name", fullName);
      localStorage.setItem("user-destination", destination);
      localStorage.setItem("user-country", origin);
      localStorage.setItem("user-field", field);
      const ini = fullName.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "G";
      localStorage.setItem("user-initials", ini);
    } catch { /* ignore */ }

    // Persist to backend if signed in
    if (getToken()) {
      try {
        const res = await authFetch("/api/users/me", {
          method: "PATCH",
          body: JSON.stringify({
            full_name: fullName,
            bio,
            country_of_residence: destination,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `Save failed (${res.status})`);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-semibold text-ink-900">My Profile</h1>
        <p className="text-sm text-ink-600 mt-1">Keep your info current so we can match you to the right opportunities.</p>
      </header>

      <form onSubmit={onSave} className="space-y-6">
        {/* Avatar */}
        <div className="card flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-clay-500 to-clay-700 text-white flex items-center justify-center text-2xl font-display font-semibold">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : initials}
            </div>
            <input
              ref={avatarInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => onAvatar(e.target.files?.[0])}
            />
            <button
              type="button"
              aria-label="Change profile photo"
              onClick={() => avatarInput.current?.click()}
              disabled={avatarBusy}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-clay-500 text-white flex items-center justify-center hover:bg-clay-600 ring-2 ring-[var(--color-surface)] transition disabled:opacity-50"
            >
              {avatarBusy ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            </button>
          </div>
          <div>
            <p className="font-medium text-ink-900">Profile photo</p>
            <p className="text-xs text-ink-500 mt-0.5">JPG, PNG or WebP, max 8 MB.</p>
          </div>
        </div>

        {/* Identity */}
        <Section icon={<User size={16} />} title="Identity">
          <Field label="Full name"><input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" placeholder="e.g. Ada Lovelace" /></Field>
          <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" /></Field>
          <Field label="Phone (optional)"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+233 ..." /></Field>
        </Section>

        {/* About */}
        <Section icon={<User size={16} />} title="About you">
          <div className="md:col-span-2">
            <Field label="Short bio (shown to mentors)">
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input min-h-[80px]" placeholder="A line or two about your goals..." />
            </Field>
          </div>
        </Section>

        {/* Origin & destination */}
        <Section icon={<Globe size={16} />} title="Origin & destination">
          <Field label="Country of origin">
            <select value={origin} onChange={(e) => setOrigin(e.target.value)} className="input">
              <option>Ghana</option><option>Nigeria</option><option>Kenya</option><option>India</option><option>Pakistan</option><option>Bangladesh</option>
            </select>
          </Field>
          <Field label="Destination country">
            <select value={destination} onChange={(e) => setDestination(e.target.value)} className="input">
              <option>Canada</option><option>United Kingdom</option><option>Germany</option><option>United States</option><option>Australia</option>
            </select>
          </Field>
        </Section>

        {/* Academic */}
        <Section icon={<GraduationCap size={16} />} title="Academic">
          <Field label="Current level">
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="input">
              <option>Undergraduate (Year 3)</option><option>Undergraduate (Year 4)</option><option>Postgraduate</option><option>Working professional</option>
            </select>
          </Field>
          <Field label="Field of study"><input value={field} onChange={(e) => setField(e.target.value)} className="input" placeholder="e.g. Computer Science" /></Field>
        </Section>

        {/* Languages */}
        <Section icon={<Languages size={16} />} title="Languages">
          <Field label="Spoken languages"><input value={languages} onChange={(e) => setLanguages(e.target.value)} className="input" placeholder="English, Twi, French..." /></Field>
        </Section>

        <div className="flex items-center justify-end gap-3 sticky bottom-4">
          {err && <span className="text-sm text-red-600">{err}</span>}
          {saved && <span className="text-sm text-leaf-600">Saved ✓</span>}
          <button type="submit" disabled={saving} className="btn-accent disabled:opacity-50">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><Save size={15} /> Save changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900 mb-4">
        <span className="text-clay-500">{icon}</span> {title}
      </h2>
      <div className="grid md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ink-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
