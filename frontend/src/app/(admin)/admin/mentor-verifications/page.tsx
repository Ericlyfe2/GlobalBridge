"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search, ShieldCheck, ShieldCheck as ShieldVerified,
  X, Check, RotateCcw, FileText, Eye, Loader2,
  ChevronDown, ChevronUp, Globe, Languages, GraduationCap,
  Clock, AlertCircle, BadgeCheck, User,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MentorDocument = {
  id: string;
  type: string;
  url: string;
  file_name: string;
  verified: boolean;
};

type MentorVerification = {
  id: string;
  full_name: string;
  email: string;
  country_of_origin: string | null;
  country_of_residence: string | null;
  bio: string | null;
  verification_status: "pending" | "verified" | "rejected";
  created_at: string;
  expertise_areas: string[];
  languages_spoken: string[];
  years_abroad: number;
  universities_attended: string[];
  available_for_mentoring: boolean;
  verified_by: string | null;
  verified_at: string | null;
  documents: MentorDocument[];
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

function DocumentBadge({ doc }: { doc: MentorDocument }) {
  return (
    <a
      href={doc.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border border-cream-200 hover:bg-cream-100 transition group"
    >
      <FileText size={12} className="text-ink-500 group-hover:text-clay-600" />
      <span className="text-ink-700 truncate max-w-[120px]">{doc.file_name}</span>
      {doc.verified && <BadgeCheck size={10} className="text-leaf-600" />}
      <Eye size={10} className="text-ink-400 opacity-0 group-hover:opacity-100 transition" />
    </a>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MentorVerificationsPage() {
  const [mentors, setMentors] = useState<MentorVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Fetch mentors
  // -----------------------------------------------------------------------
  const fetchMentors = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await authFetch("/api/admin/mentor-verifications");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
      setMentors(data.mentors ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    fetchMentors();
    return () => ctrl.abort();
  }, []);

  // -----------------------------------------------------------------------
  // Filtering & search
  // -----------------------------------------------------------------------
  const filtered = useMemo(() => {
    return mentors.filter((m) => {
      const matchSearch =
        !q ||
        m.full_name.toLowerCase().includes(q.toLowerCase()) ||
        m.email.toLowerCase().includes(q.toLowerCase());
      const matchStatus = statusFilter === "all" || m.verification_status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [mentors, q, statusFilter]);

  const selected = mentors.find((m) => m.id === selectedId) ?? null;

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------
  async function approve(id: string) {
    setActionLoading(id);
    try {
      const res = await authFetch(`/api/admin/mentor-verifications/${id}/approve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to approve");
      setMentors((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, verification_status: "verified" } : m,
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
      const res = await authFetch(`/api/admin/mentor-verifications/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason || undefined }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      setMentors((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, verification_status: "rejected" } : m,
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
      const res = await authFetch(`/api/admin/mentor-verifications/${id}/reopen`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to reopen");
      setMentors((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, verification_status: "pending" } : m,
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
            Mentor Verifications
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            {mentors.filter((m) => m.verification_status === "pending").length} pending
            {" · "}
            {mentors.length} total
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
            placeholder="Search name or email…"
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
        <button onClick={fetchMentors} className="btn-ghost text-sm gap-1.5 ml-auto shrink-0">
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
          <p className="text-sm">Loading verifications…</p>
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
                  <p className="text-sm">No mentors match these filters.</p>
                </>
              ) : (
                <>
                  <ShieldCheck size={28} className="opacity-40 mb-2" />
                  <p className="text-sm">All caught up!</p>
                  <p className="text-xs text-ink-400 mt-1">No pending verifications.</p>
                </>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-cream-200 flex-1 overflow-y-auto max-h-[600px]">
              {filtered.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => setSelectedId(m.id)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-cream-100 transition ${
                      selectedId === m.id
                        ? "bg-clay-500/5 border-l-2 border-l-clay-500"
                        : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-clay-500 text-white flex items-center justify-center text-xs font-medium shrink-0">
                      {initials(m.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-ink-900 truncate">
                          {m.full_name}
                        </p>
                        {m.verification_status === "verified" && (
                          <BadgeCheck size={12} className="text-leaf-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-ink-500 truncate">{m.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={m.verification_status} />
                        {m.country_of_residence && (
                          <span className="text-[10px] text-ink-400">{m.country_of_residence}</span>
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
              {/* Profile header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-clay-500 text-white flex items-center justify-center text-lg font-semibold shrink-0">
                    {initials(selected.full_name)}
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-ink-900 flex items-center gap-2">
                      {selected.full_name}
                      {selected.verification_status === "verified" && (
                        <ShieldVerified size={18} className="text-leaf-600" />
                      )}
                    </h2>
                    <p className="text-sm text-ink-600">{selected.email}</p>
                  </div>
                </div>
                <StatusBadge status={selected.verification_status} />
              </div>

              {/* Quick info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="card !bg-cream-50 !p-3">
                  <Globe size={14} className="text-ink-500 mb-1" />
                  <p className="text-xs text-ink-500">Country</p>
                  <p className="text-sm font-medium text-ink-900">{selected.country_of_residence ?? selected.country_of_origin ?? "—"}</p>
                </div>
                <div className="card !bg-cream-50 !p-3">
                  <Languages size={14} className="text-ink-500 mb-1" />
                  <p className="text-xs text-ink-500">Languages</p>
                  <p className="text-sm font-medium text-ink-900 truncate">
                    {selected.languages_spoken?.length
                      ? selected.languages_spoken.join(", ")
                      : "—"}
                  </p>
                </div>
                <div className="card !bg-cream-50 !p-3">
                  <GraduationCap size={14} className="text-ink-500 mb-1" />
                  <p className="text-xs text-ink-500">Years abroad</p>
                  <p className="text-sm font-medium text-ink-900">{selected.years_abroad ?? 0}</p>
                </div>
              </div>

              {/* Expertise & Universities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-600 mb-2">
                    Expertise
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.expertise_areas?.length ? (
                      selected.expertise_areas.map((area) => (
                        <span key={area} className="badge !bg-clay-500/10 !text-clay-700 text-xs">
                          {area}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-ink-400">None listed</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-600 mb-2">
                    Universities
                  </p>
                  <ul className="space-y-1">
                    {selected.universities_attended?.length ? (
                      selected.universities_attended.map((uni) => (
                        <li key={uni} className="text-sm text-ink-700 flex items-center gap-1.5">
                          <GraduationCap size={12} className="text-ink-400 shrink-0" />
                          {uni}
                        </li>
                      ))
                    ) : (
                      <span className="text-sm text-ink-400">None listed</span>
                    )}
                  </ul>
                </div>
              </div>

              {/* Bio */}
              {selected.bio && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-600 mb-2">
                    Bio
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

              {/* Verification history */}
              {selected.verified_at && (
                <div className="border-t border-cream-200 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-600 mb-2">
                    Verification History
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <BadgeCheck size={14} className="text-leaf-600 shrink-0" />
                      <span className="text-ink-700">
                        Verified on{" "}
                        <span className="font-medium">
                          {new Date(selected.verified_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                        {selected.verified_by && (
                          <>
                            {" "}by{" "}
                            <span className="font-medium">{selected.verified_by}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
                    <BadgeCheck size={15} /> Verified
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center text-center py-20 text-ink-500">
              <User size={40} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">Select a mentor to review</p>
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
              Provide a reason for the rejection. This will be visible to the applicant.
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
