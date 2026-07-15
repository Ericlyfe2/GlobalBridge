"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Settings as SettingsIcon, Save, Globe, Bot, Shield, RefreshCw,
  Mail, AlertCircle, CheckCircle2, ToggleLeft,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

type PlatformSettings = {
  platform_name: string;
  maintenance_mode: boolean;
  allow_registrations: boolean;
  contact_email: string;
  ai_chat_enabled: boolean;
  ai_doc_check_enabled: boolean;
  ai_scam_detection_enabled: boolean;
  ai_translation_enabled: boolean;
  ai_temperature: number;
  ai_model: string;
  ai_system_prompt: string;
  max_login_attempts: number;
  session_timeout_minutes: number;
};

const AI_MODELS = [
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5 (fast, cheap)" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (balanced)" },
  { value: "claude-opus-4-7", label: "Claude Opus 4.7 (highest quality)" },
] as const;

const DEFAULT_SETTINGS: PlatformSettings = {
  platform_name: "GlobalBridge",
  maintenance_mode: false,
  allow_registrations: true,
  contact_email: "",
  ai_chat_enabled: true,
  ai_doc_check_enabled: true,
  ai_scam_detection_enabled: true,
  ai_translation_enabled: true,
  ai_temperature: 0.3,
  ai_model: "claude-haiku-4-5",
  ai_system_prompt: "",
  max_login_attempts: 5,
  session_timeout_minutes: 60,
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setFetchErr(null);
    try {
      const res = await authFetch("/api/admin/settings", {}, 15000);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setSettings((data.settings ?? data) as PlatformSettings);
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const update = <K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await authFetch(
        "/api/admin/settings",
        {
          method: "PUT",
          body: JSON.stringify(settings),
        },
        15000,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Save failed (${res.status})`);
      }
      setFeedback({ type: "success", message: "Settings saved successfully." });
    } catch (e) {
      setFeedback({
        type: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="h-8 w-48 bg-cream-200 rounded animate-pulse" />
        <div className="h-4 w-72 bg-cream-200 rounded animate-pulse" />
        {[1, 2, 3].map((s) => (
          <div key={s} className="card space-y-4">
            <div className="h-6 w-40 bg-cream-200 rounded animate-pulse" />
            {[1, 2, 3].map((r) => (
              <div key={r} className="h-10 w-full bg-cream-200 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (fetchErr) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="card border-red-300 text-center py-12">
          <AlertCircle size={32} className="mx-auto text-red-500 mb-3" />
          <p className="text-red-600 font-medium mb-2">Failed to load settings</p>
          <p className="text-sm text-ink-600 mb-4">{fetchErr}</p>
          <button onClick={loadSettings} className="btn-ghost border border-cream-300">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink-900 flex items-center gap-2">
            <SettingsIcon className="text-clay-500" /> Settings
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Manage platform-wide configuration options.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-accent"
        >
          {saving ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </header>

      {feedback && (
        <div
          className={`card flex items-center gap-3 text-sm ${
            feedback.type === "success"
              ? "border-leaf-300 text-leaf-700"
              : "border-red-300 text-red-600"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 size={16} className="shrink-0" />
          ) : (
            <AlertCircle size={16} className="shrink-0" />
          )}
          {feedback.message}
        </div>
      )}

      {/* General */}
      <Section icon={<Globe size={16} />} title="General">
        <Field label="Platform name">
          <input
            type="text"
            value={settings.platform_name}
            onChange={(e) => update("platform_name", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Contact email">
          <input
            type="email"
            value={settings.contact_email}
            onChange={(e) => update("contact_email", e.target.value)}
            className="input"
            placeholder="admin@example.com"
          />
          <p className="text-xs text-ink-500 mt-1">
            Public-facing contact address for support inquiries.
          </p>
        </Field>
        <Toggle
          label="Maintenance mode"
          description="When enabled, only admins can access the platform."
          value={settings.maintenance_mode}
          onChange={(v) => update("maintenance_mode", v)}
        />
        <Toggle
          label="Allow registrations"
          description="New users can create accounts."
          value={settings.allow_registrations}
          onChange={(v) => update("allow_registrations", v)}
        />
      </Section>

      {/* AI Configuration */}
      <Section icon={<Bot size={16} />} title="AI Configuration">
        <Field label="Model">
          <select
            value={settings.ai_model}
            onChange={(e) => update("ai_model", e.target.value)}
            className="input"
          >
            {AI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Temperature — ${settings.ai_temperature.toFixed(2)}`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.ai_temperature}
            onChange={(e) =>
              update("ai_temperature", parseFloat(e.target.value))
            }
            className="w-full accent-clay-500"
          />
          <p className="text-xs text-ink-500 mt-1">
            Lower = more deterministic. Higher = more creative.
          </p>
        </Field>
        <Field label="System prompt">
          <textarea
            value={settings.ai_system_prompt}
            onChange={(e) => update("ai_system_prompt", e.target.value)}
            className="input min-h-[140px] font-mono text-xs"
            placeholder="Instructions for the AI assistant…"
          />
          <p className="text-xs text-ink-500 mt-1">
            Instruct the model how to behave. Keep it concise.
          </p>
        </Field>
        <div className="pt-2 border-t border-cream-200">
          <p className="text-xs font-medium text-ink-600 mb-2">
            Feature toggles
          </p>
          <Toggle
            label="Conversational chat"
            value={settings.ai_chat_enabled}
            onChange={(v) => update("ai_chat_enabled", v)}
          />
          <Toggle
            label="Document validity checker"
            value={settings.ai_doc_check_enabled}
            onChange={(v) => update("ai_doc_check_enabled", v)}
          />
          <Toggle
            label="Scam / fraud detection"
            value={settings.ai_scam_detection_enabled}
            onChange={(v) => update("ai_scam_detection_enabled", v)}
          />
          <Toggle
            label="Real-time translation"
            value={settings.ai_translation_enabled}
            onChange={(v) => update("ai_translation_enabled", v)}
          />
        </div>
      </Section>

      {/* Security */}
      <Section icon={<Shield size={16} />} title="Security">
        <Field label="Max login attempts">
          <input
            type="number"
            min={1}
            max={100}
            value={settings.max_login_attempts}
            onChange={(e) =>
              update("max_login_attempts", parseInt(e.target.value) || 1)
            }
            className="input"
          />
          <p className="text-xs text-ink-500 mt-1">
            Lockout threshold before temporary ban.
          </p>
        </Field>
        <Field label="Session timeout (minutes)">
          <input
            type="number"
            min={1}
            max={1440}
            value={settings.session_timeout_minutes}
            onChange={(e) =>
              update(
                "session_timeout_minutes",
                parseInt(e.target.value) || 1,
              )
            }
            className="input"
          />
          <p className="text-xs text-ink-500 mt-1">
            Idle session duration before automatic logout.
          </p>
        </Field>
      </Section>

      <div className="flex justify-end gap-2 pb-8">
        <button
          onClick={() => loadSettings()}
          className="btn-ghost border border-cream-300"
        >
          <RefreshCw size={14} /> Discard changes
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-accent">
          {saving ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900 mb-4">
        <span className="text-clay-500">{icon}</span> {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ink-600 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 gap-4">
      <div className="min-w-0">
        <p className="text-sm text-ink-900">{label}</p>
        {description && (
          <p className="text-xs text-ink-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${
          value ? "bg-clay-500" : "bg-cream-300"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
            value ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
