"use client";

import { useState } from "react";
import {
  FileCheck, Upload, AlertTriangle, CheckCircle2, X, Loader2, FileText, ShieldCheck, Bot,
} from "lucide-react";

type Severity = "ok" | "warn" | "fail";

type Finding = { id: string; label: string; detail: string; severity: Severity };

type CheckResult = {
  score: number;
  label: string;
  summary: string;
  findings: Finding[];
};

const docTypes = [
  { value: "passport",        label: "Passport" },
  { value: "national_id",     label: "National ID" },
  { value: "bank_statement",  label: "Bank statement" },
  { value: "transcript",      label: "Academic transcript" },
  { value: "acceptance",      label: "Acceptance letter" },
  { value: "study_permit",    label: "Study permit / visa" },
];

export default function DocCheckerPage() {
  const [docType, setDocType] = useState("passport");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File) {
    setFile(f);
    setResult(null);
    setError(null);
  }

  async function runCheck() {
    if (!file) return;
    setChecking(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/ai/doc-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType,
          fileName: file.name,
          fileSize: file.size,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        setError(data?.error || `Request failed (${res.status})`);
      } else {
        setResult({
          score: data.score,
          label: data.label,
          summary: data.summary,
          findings: data.findings ?? [],
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setChecking(false);
    }
  }

  const score = result ? deriveTone(result) : null;
  const findings = result?.findings ?? null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <header className="mb-6 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-clay-500/15 text-clay-600 flex items-center justify-center shrink-0">
          <FileCheck size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900 flex items-center gap-2">
            AI Document Validity Checker
            <span className="badge badge-clay text-[10px]"><Bot size={10} /> AI</span>
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Upload your document. We check for common rejection triggers before you submit to the government.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <label className="block mb-3">
              <span className="block text-xs font-medium text-ink-600 mb-1.5">Document type</span>
              <select value={docType} onChange={(e) => setDocType(e.target.value)} className="input">
                {docTypes.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </label>

            <label
              className="block border-2 border-dashed border-cream-300 rounded-lg p-6 text-center hover:border-clay-500 cursor-pointer transition"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) pick(f);
              }}
            >
              <Upload size={24} className="mx-auto text-ink-500 mb-2" />
              {file ? (
                <>
                  <p className="text-sm font-medium text-ink-900 truncate">{file.name}</p>
                  <p className="text-xs text-ink-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  <button onClick={(e) => { e.preventDefault(); setFile(null); setResult(null); }} className="text-xs text-red-600 hover:underline mt-2">
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-ink-900">Drop file here or click</p>
                  <p className="text-xs text-ink-500 mt-1">PDF, JPG, PNG · max 10MB</p>
                </>
              )}
              <input
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }}
              />
            </label>

            <label className="block mt-3">
              <span className="block text-xs font-medium text-ink-600 mb-1.5">Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 'Expires Aug 2026, name on form is reverse order'"
                className="input text-xs min-h-[60px]"
              />
            </label>

            <button
              onClick={runCheck}
              disabled={!file || checking}
              className="btn-accent w-full mt-4 disabled:opacity-50"
            >
              {checking ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : <><Bot size={14} /> Run AI check</>}
            </button>

            {error && (
              <div className="mt-3 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/25 text-xs text-red-600 flex items-start gap-2">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="card text-xs text-ink-600 leading-relaxed">
            <p className="font-medium text-ink-900 mb-2 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-leaf-600" /> Private &amp; encrypted
            </p>
            Files are scanned in-memory only. Nothing is stored on our servers. AI runs on-device for OCR; final analysis hits our secure API.
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {!file && !findings && (
            <div className="card text-center py-16 text-ink-500">
              <FileText size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Upload a document to see what could trip up your application.</p>
            </div>
          )}

          {file && !findings && !checking && (
            <div className="card text-center py-16 text-ink-500">
              <p className="text-sm">Ready when you are. Hit <span className="font-medium text-clay-600">Run AI check</span>.</p>
            </div>
          )}

          {checking && (
            <div className="card text-center py-16">
              <Loader2 size={32} className="mx-auto mb-3 text-clay-500 animate-spin" />
              <p className="text-sm text-ink-700">Scanning {docTypes.find((d) => d.value === docType)?.label}...</p>
              <p className="text-xs text-ink-500 mt-2">Checking expiry, name match, format, MRZ, watermarks...</p>
            </div>
          )}

          {findings && score && (
            <div className="space-y-4">
              {/* Score */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-ink-500">Validity score</p>
                    <p className="text-4xl font-display font-semibold text-ink-900 mt-1">
                      {score.value}<span className="text-base text-ink-500">/100</span>
                    </p>
                  </div>
                  <ScoreBadge tone={score.tone} label={score.label} />
                </div>
                <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      score.tone === "leaf" ? "bg-leaf-500" : score.tone === "amber" ? "bg-amber-500" : "bg-red-600"
                    }`}
                    style={{ width: `${score.value}%` }}
                  />
                </div>
                <p className="text-xs text-ink-500 mt-3">{score.summary}</p>
              </div>

              {/* Findings list */}
              <div className="card !p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-cream-200">
                  <h2 className="font-display text-lg font-semibold text-ink-900">{findings.length} checks performed</h2>
                </div>
                <ul className="divide-y divide-cream-200">
                  {findings.map((f) => (
                    <li key={f.id} className="px-5 py-3 flex items-start gap-3">
                      <FindingIcon s={f.severity} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          f.severity === "ok" ? "text-ink-900" :
                          f.severity === "warn" ? "text-amber-500" :
                          "text-red-600"
                        }`}>{f.label}</p>
                        <p className="text-xs text-ink-600 mt-0.5">{f.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-ink-500 text-center">
                ⚠ AI checks supplement but don&apos;t replace official document review. Always cross-check on the government portal.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FindingIcon({ s }: { s: Severity }) {
  if (s === "ok")   return <CheckCircle2 size={16} className="text-leaf-600 mt-0.5 shrink-0" />;
  if (s === "warn") return <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />;
  return <X size={16} className="text-red-600 mt-0.5 shrink-0" />;
}

function ScoreBadge({ tone, label }: { tone: string; label: string }) {
  const cls =
    tone === "leaf"  ? "!bg-leaf-500/15 !text-leaf-600" :
    tone === "amber" ? "!bg-amber-500/15 !text-amber-500" :
                       "!bg-red-500/15 !text-red-600";
  return <span className={`badge ${cls}`}>{label}</span>;
}

function deriveTone(r: CheckResult) {
  const fail = r.findings.filter((f) => f.severity === "fail").length;
  const warn = r.findings.filter((f) => f.severity === "warn").length;
  const tone = fail > 0 ? "red" : warn > 0 ? "amber" : "leaf";
  return { value: r.score, tone, label: r.label, summary: r.summary };
}
