"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search, ShieldCheck as ShieldVerified,
  X, Check, RotateCcw, FileText, Eye, Loader2,
  Globe, Building2, BadgeCheck, Briefcase,
  Link, Users, Clock, AlertCircle,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EmployerDocument = {
  id: string;
  type: string;
  url: string;
  file_name: string;
  verified: boolean;
};

type EmployerVerification = {
  id: string;
  full_name: string;
  email: string;
  country_of_origin: string | null;
  country_of_residence: string | null;
  bio: string | null;
  verification_status: "pending" | "verified" | "rejected";
  created_at: string;
  company_name: string;
  company_website: string | null;
  company_size: string | null;
  industry: string | null;
  sponsors_visas: boolean;
  visa_sponsorship_countries: string[];
  documents: EmployerDocument[];
};

type StatusFilter = "all" | "pending" | "verified" | "rejected";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function docTypeLabel(doc: EmployerDocument): string {
  switch (doc.type) {
    case "business_license": return "Business License";
    case "registration":      return "Registration";
    case "logo":              return "Logo";
    default:                  return doc.file_name;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "verified":
      return "badge-verified";
    case "rejected":
      return "!bg-red-500/15 !text-red-600";
    default:
      return "!bg-amber-500/15 !text-amber-500";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    default:
      return "Pending";
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${statusColor(status)} flex items-center gap-1 w-fit`}>
      {status === "verified" && <BadgeCheck size={11} />}
      {status === "pending" && <Clock size={11} />}
      {status === "rejected" && <X size={11} />}
      {statusLabel(status)}
    </span>
  );
}

function DocumentBadge({ doc }: { doc: EmployerDocument }) {
  return (
    <a
      href={doc.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border border-cream-200 hover:bg-cream-100 transition group"
    >
      <FileText size={12} className="text-ink-500 group-hover:text-clay-600" />
      <span className="text-ink-700 truncate max-w-[120px]">{docTypeLabel(doc)}</span>
      {doc.verified && <BadgeCheck size={10} className="text-leaf-600" />}
      <Eye size={10} className="text-ink-400 opacity-0 group-hover:opacity-100 transition" />
    </a>
  );
}

function VisaSponsorshipBadge({ country }: { country: string }) {
  return (
    <span className="badge !bg-sky-500/10 !text-sky-600 text-[10px]">
      {country}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function EmployerVerificationsPage() {
  const [employers, setEmployers] = useState<EmployerVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Fetch employers
  // -----------------------------------------------------------------------
  const fetchEmployers = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await authFetch("/api/admin/employer-verifications");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
      setEmployers(data.employers ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    fetchEmployers();
    return () => ctrl.abort();
  }, []);

  // -----------------------------------------------------------------------
  // Filtering & search
  // -----------------------------------------------------------------------
  const filtered = useMemo(() => {
    return employers.filter((e) => {
      const matchSearch =
        !q ||
        e.company_name?.toLowerCase().includes(q.toLowerCase()) ||
        e.full_name?.toLowerCase().includes(q.toLowerCase()) ||
        e.email?.toLowerCase().includes(q.toLowerCase());
      const matchStatus = statusFilter === "all" || e.verification_status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [employers, q, statusFilter]);

  const selected = employers.find((e) => e.id === selectedId) ?? null;

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------
  async function approve(id: string) {
    setActionLoading(id);
    try {
      const res = await authFetch(`/api/admin/employer-verifications/${id}/approve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to approve");
      setEmployers((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, verification_status: "verified" } : e,
        ),
      );
    } catch {
      // swallow
    } finally {
      setActionLoading(null);
    }
  }

  async function reject(id: string) {
    setActionLoading(id);
    try {
      const res = await authFetch(`/api/admin/employer-verifications/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason || undefined }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      setEmployers((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, verification_status: "rejected" } : e,
        ),
      );
      setRejectModal(null);
      setRejectReason("");
    } catch {
      // swallow
    } finally {
      setActionLoading(null);
    }
  }

  async function reopen(id: string) {
    setActionLoading(id);
    try {
      const res = await authFetch(`/api/admin/employer-verifications/${id}/reopen`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to reopen");
      setEmployers((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, verification_status: "pending" } : e,
        ),
      );
    } catch {
      // swallow
    } finally {
      setActionLoading(null);
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink-900">
            Employer Verifications
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            {employers.filter((e) => e.verification_status === "pending").length} pending
            {" · "}
            {employers.length} total
          </p>
        </div>
      </header>

      {/* ── Search & Filters ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input pl-9 text-sm w-full"
            placeholder="Search company, name, or email…"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="input text-sm max-w-[180px]"
        >
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="all">All statuses</option>
        </select>
        <button onClick={fetchEmployers} className="btn-ghost text-sm gap-1.5 ml-auto shrink-0">
          <RotateCcw size={13} /> Refresh
        </button>
      </div>

      {/* ── Error ──────────────────────────────────────────── */}
      {err && (
        <div className="card border-red-300 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle size={15} /> Couldn&apos;t load: {err}
        </div>
      )}

      {/* ── Loading ────────────────────────────────────────── */}
      {loading && !err && (
        <div className="card text-center py-16 text-ink-500">
          <Loader2 size={22} className="animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading employer verifications…</p>
        </div>
      )}

      {/* ── Main grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Queue ───────────────────────────────────────── */}
        <div className="lg:col-span-1 card !p-0 overflow-hidden flex flex-col min-h-[300px]">
          <div className="px-4 py-3 border-b border-cream-200 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-600">
              Queue ({filtered.length})
            </span>
            {statusFilter !== "all" && (
              <span className="badge !bg-clay-500/10 !text-clay-600 text-[10px]">
                {statusFilter}
              </span>
            )}
          </div>

          {!loading && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4 text-ink-500 flex-1">
              {q || statusFilter !== "pending" ? (
                <>
                  <Search size={28} className="opacity-40 mb-2" />
                  <p className="text-sm">No employers match these filters.</p>
                </>
              ) : (
                <>
                  <ShieldVerified size={28} className="opacity-40 mb-2" />
                  <p className="text-sm">All caught up!</p>
                  <p className="text-xs text-ink-400 mt-1">No pending employer verifications.</p>
                </>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-cream-200 flex-1 overflow-y-auto max-h-[600px]">
              {filtered.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => setSelectedId(e.id)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-cream-100 transition ${
                      selectedId === e.id
                        ? "bg-clay-500/5 border-l-2 border-l-clay-500"
                        : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-clay-500 text-white flex items-center justify-center text-xs font-medium shrink-0">
                      <Briefcase size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-ink-900 truncate">
                          {e.company_name}
                        </p>
                        {e.verification_status === "verified" && (
                          <BadgeCheck size={12} className="text-leaf-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-ink-500 truncate">{e.full_name} · {e.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={e.verification_status} />
                        {e.industry && (
                          <span className="text-[10px] text-ink-400">{e.industry}</span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ─── Detail Panel ────────────────────────────────── */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="card space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-clay-500 text-white flex items-center justify-center text-lg font-semibold shrink-0">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-ink-900 flex items-center gap-2">
                      {selected.company_name}
                      {selected.verification_status === "verified" && (
                        <ShieldVerified size={18} className="text-leaf-600" />
                      )}
                    </h2>
                    <p className="text-sm text-ink-600">{selected.full_name} · {selected.email}</p>
                  </div>
                </div>
                <StatusBadge status={selected.verification_status} />
              </div>

              {/* Quick info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="card !bg-cream-50 !p-3">
                  <Globe size={14} className="text-ink-500 mb-1" />
                  <p className="text-xs text-ink-500">Country</p>
                  <p className="text-sm font-medium text-ink-900">{selected.country_of_residence ?? selected.country_of_origin ?? "—"}</p>
                </div>
                <div className="card !bg-cream-50 !p-3">
                  <Building2 size={14} className="text-ink-500 mb-1" />
                  <p className="text-xs text-ink-500">Company Size</p>
                  <p className="text-sm font-medium text-ink-900">{selected.company_size ?? "—"}</p>
                </div>
                <div className="card !bg-cream-50 !p-3">
                  <Briefcase size={14} className="text-ink-500 mb-1" />
                  <p className="text-xs text-ink-500">Industry</p>
                  <p className="text-sm font-medium text-ink-900">{selected.industry ?? "—"}</p>
                </div>
                <div className="card !bg-cream-50 !p-3">
                  <Users size={14} className="text-ink-500 mb-1" />
                  <p className="text-xs text-ink-500">Contact</p>
                  <p className="text-sm font-medium text-ink-900 truncate">{selected.full_name}</p>
                </div>
              </div>

              {/* Website & Visa sponsorship */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-600 mb-2">
                    Company Website
                  </p>
                  {selected.company_website ? (
                    <a
                      href={selected.company_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-clay-600 hover:text-clay-700 transition"
                    >
                      <Link size={13} />
                      {selected.company_website.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <span className="text-sm text-ink-400">Not provided</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-600 mb-2">
                    Visa Sponsorship
                  </p>
                  {selected.sponsors_visas ? (
                    <div className="space-y-1.5">
                      <span className="badge badge-verified text-xs">Yes</span>
                      {selected.visa_sponsorship_countries?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selected.visa_sponsorship_countries.map((c) => (
                            <VisaSponsorshipBadge key={c} country={c} />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-ink-400">No</span>
                  )}
                </div>
              </div>

              {/* Bio */}
              {selected.bio && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-600 mb-2">
                    About
                  </p>
                  <p className="text-sm text-ink-700 leading-relaxed">{selected.bio}</p>
                </div>
              )}

              {/* Documents */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-600 mb-2">
                  Documents ({selected.documents.length})
                </p>
                {selected.documents.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selected.documents.map((doc) => (
                      <DocumentBadge key={doc.id} doc={doc} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-400">No documents uploaded.</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="border-t border-cream-200 pt-4 flex flex-wrap items-center justify-end gap-2">
                {selected.verification_status === "pending" && (
                  <>
                    <button
                      onClick={() => setRejectModal(selected.id)}
                      disabled={actionLoading === selected.id}
                      className="btn-ghost border border-red-300 text-red-600 hover:!bg-red-500/10 disabled:opacity-50"
                    >
                      <X size={15} /> Reject
                    </button>
                    <button
                      onClick={() => approve(selected.id)}
                      disabled={actionLoading === selected.id}
                      className="btn-accent disabled:opacity-50"
                    >
                      {actionLoading === selected.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Check size={15} />
                      )}
                      Approve
                    </button>
                  </>
                )}
                {selected.verification_status === "rejected" && (
                  <button
                    onClick={() => reopen(selected.id)}
                    disabled={actionLoading === selected.id}
                    className="btn-ghost border border-cream-300 disabled:opacity-50"
                  >
                    {actionLoading === selected.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <RotateCcw size={15} />
                    )}
                    Reopen verification
                  </button>
                )}
                {selected.verification_status === "verified" && (
                  <span className="flex items-center gap-1.5 text-sm text-leaf-700">
                    <BadgeCheck size={15} /> Verified Employer
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center text-center py-20 text-ink-500">
              <Building2 size={40} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">Select an employer to review</p>
              <p className="text-xs text-ink-400 mt-1">
                Choose from the queue on the left.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Reject Modal ───────────────────────────────────── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card max-w-md w-full !p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-ink-900">Reject Verification</h3>
              <button
                onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="p-1 rounded hover:bg-cream-200 transition"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-ink-600">
              Provide a reason for the rejection. This will be visible to the employer.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="input min-h-[100px] text-sm"
              placeholder="Enter rejection reason…"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => reject(rejectModal)}
                disabled={actionLoading === rejectModal}
                className="btn-ghost border border-red-300 text-red-600 hover:!bg-red-500/10 disabled:opacity-50 text-sm"
              >
                {actionLoading === rejectModal ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <X size={15} />
                )}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
