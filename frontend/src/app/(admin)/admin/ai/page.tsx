"use client";

import { useState } from "react";
import { Bot, Save, Sparkles, ShieldAlert, MessageSquare, ThumbsUp, ThumbsDown, Activity } from "lucide-react";

export default function AIConfigPage() {
  const [model, setModel] = useState("claude-haiku-4-5");
  const [temperature, setTemperature] = useState(0.3);
  const [escalateThreshold, setEscalateThreshold] = useState(0.6);
  const [systemPrompt, setSystemPrompt] = useState(
    `You are GlobalBridge's immigration assistant. Always cite the official government source URL when you quote a rule. If you are not 100% sure, say so and escalate to a verified human mentor. Never give legal advice. Be concise — short sentences, numbered steps.`,
  );
  const [enabled, setEnabled] = useState({ chat: true, docCheck: true, scamDetect: true, translate: true });

  const metrics = [
    { label: "Conversations / day",  value: "1,284",  icon: MessageSquare, tone: "clay" },
    { label: "Avg. response time",   value: "1.8s",   icon: Activity,      tone: "leaf" },
    { label: "👍 Positive",          value: "92.4%",  icon: ThumbsUp,      tone: "leaf" },
    { label: "👎 Escalated to human", value: "5.1%",  icon: ThumbsDown,    tone: "amber" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-display font-semibold text-ink-900 flex items-center gap-2">
          <Bot className="text-clay-500" /> AI Configuration
        </h1>
        <p className="text-sm text-ink-600 mt-1">Tune the immigration assistant. Changes apply to all users.</p>
      </header>

      {/* Live metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="card">
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-500">{m.label}</p>
              <m.icon size={14} className={
                m.tone === "leaf"  ? "text-leaf-600" :
                m.tone === "amber" ? "text-amber-500" :
                                     "text-clay-500"
              } />
            </div>
            <p className="text-2xl font-display font-semibold text-ink-900 mt-2">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Model + temperature */}
      <Section icon={<Sparkles size={16} />} title="Model & sampling">
        <Field label="Model">
          <select value={model} onChange={(e) => setModel(e.target.value)} className="input">
            <option value="claude-opus-4-7">claude-opus-4-7 (highest quality)</option>
            <option value="claude-sonnet-4-6">claude-sonnet-4-6 (balanced)</option>
            <option value="claude-haiku-4-5">claude-haiku-4-5 (fastest, cheapest)</option>
          </select>
        </Field>
        <Field label={`Temperature — ${temperature.toFixed(2)}`}>
          <input type="range" min={0} max={1} step={0.05} value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full accent-clay-500" />
          <p className="text-xs text-ink-500 mt-1">Lower = more deterministic. Keep ≤ 0.4 for visa accuracy.</p>
        </Field>
        <Field label={`Escalate-to-human confidence threshold — ${escalateThreshold.toFixed(2)}`}>
          <input type="range" min={0} max={1} step={0.05} value={escalateThreshold} onChange={(e) => setEscalateThreshold(parseFloat(e.target.value))} className="w-full accent-clay-500" />
          <p className="text-xs text-ink-500 mt-1">If model confidence is below this, surface a mentor escalation card.</p>
        </Field>
      </Section>

      {/* System prompt */}
      <Section icon={<MessageSquare size={16} />} title="System prompt">
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="input min-h-[160px] font-mono text-xs"
        />
        <p className="text-xs text-ink-500 mt-2">
          Tip: instruct the model to cite official source URLs and never give legal advice.
        </p>
      </Section>

      {/* Feature flags */}
      <Section icon={<ShieldAlert size={16} />} title="Feature flags">
        <Toggle label="Conversational chat (/assistant)"     value={enabled.chat}        onChange={(v) => setEnabled({ ...enabled, chat: v })} />
        <Toggle label="Document validity checker"            value={enabled.docCheck}    onChange={(v) => setEnabled({ ...enabled, docCheck: v })} />
        <Toggle label="Auto scam / fraud detection"          value={enabled.scamDetect}  onChange={(v) => setEnabled({ ...enabled, scamDetect: v })} />
        <Toggle label="Real-time translation (50+ langs)"    value={enabled.translate}   onChange={(v) => setEnabled({ ...enabled, translate: v })} />
      </Section>

      <div className="flex justify-end gap-2">
        <button className="btn-ghost border border-cream-300">Reset to defaults</button>
        <button className="btn-accent"><Save size={15} /> Save changes</button>
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
      <div className="space-y-4">{children}</div>
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

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <p className="text-sm text-ink-900">{label}</p>
      <button
        type="button"
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-clay-500" : "bg-cream-300"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? "left-5" : "left-0.5"}`} />
      </button>
    </div>
  );
}
