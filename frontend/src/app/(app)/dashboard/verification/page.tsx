"use client";

import { useState } from "react";
import { ShieldCheck, Mail, Phone, FileText, CheckCircle2, Clock, Upload } from "lucide-react";

type Step = "pending" | "in_review" | "done";

export default function VerificationPage() {
  const [steps] = useState<{ key: string; title: string; desc: string; icon: React.ReactNode; status: Step }[]>([
    { key: "email", title: "Email verified", desc: "Confirmed via magic link.", icon: <Mail size={16} />, status: "done" },
    { key: "phone", title: "Phone number", desc: "Send SMS code to verify identity.", icon: <Phone size={16} />, status: "pending" },
    { key: "id", title: "Government ID", desc: "Upload passport / national ID. Reviewed within 24h.", icon: <FileText size={16} />, status: "pending" },
    { key: "student", title: "Student / immigrant status", desc: "Upload acceptance letter, study permit, or residence card.", icon: <ShieldCheck size={16} />, status: "in_review" },
  ]);

  const progress = Math.round((steps.filter((s) => s.status === "done").length / steps.length) * 100);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-8">
        <span className="badge badge-clay mb-3">Trust & safety</span>
        <h1 className="text-3xl font-display font-semibold text-ink-900">Verification</h1>
        <p className="text-sm text-ink-600 mt-1">
          Verified profiles get badges, higher placement in mentor matching, and access to housing applications.
        </p>
      </header>

      {/* Progress */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-ink-700">Profile trust level</p>
          <span className="text-sm font-semibold text-clay-600">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-clay-500 to-leaf-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-ink-500 mt-3">
          Complete all 4 steps to unlock the <span className="font-medium text-leaf-600">Verified</span> badge.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((s) => (
          <div key={s.key} className="card flex items-start gap-4">
            <StatusIcon status={s.status} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-ink-900">{s.title}</h3>
                <StatusBadge status={s.status} />
              </div>
              <p className="text-sm text-ink-600 mt-1">{s.desc}</p>
            </div>
            {s.status === "pending" && (
              <button className="btn-accent text-sm shrink-0">
                {s.key === "phone" ? "Send code" : <><Upload size={13} /> Upload</>}
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-ink-500">
        Your documents are encrypted at rest and only reviewed by GlobalBridge admins.
        We never share them with third parties.
      </p>
    </div>
  );
}

function StatusIcon({ status }: { status: Step }) {
  if (status === "done") {
    return (
      <div className="w-9 h-9 rounded-full bg-leaf-500/15 text-leaf-600 flex items-center justify-center shrink-0">
        <CheckCircle2 size={18} />
      </div>
    );
  }
  if (status === "in_review") {
    return (
      <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
        <Clock size={18} />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-cream-200 text-ink-500 flex items-center justify-center shrink-0">
      <ShieldCheck size={18} />
    </div>
  );
}

function StatusBadge({ status }: { status: Step }) {
  if (status === "done") return <span className="badge badge-verified">Verified</span>;
  if (status === "in_review") return <span className="badge !bg-amber-500/15 !text-amber-500">In review</span>;
  return <span className="badge !bg-cream-200 !text-ink-600">Pending</span>;
}
