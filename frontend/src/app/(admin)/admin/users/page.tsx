"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck, MoreVertical, Ban, CheckCircle2, Loader2, Trash2, UserCog, Mail, Globe, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { authFetch } from "@/lib/auth";

type Role = "super_admin" | "admin" | "student" | "mentor" | "employer";
type StatusFilter = "all" | "pending" | "verified" | "suspended" | "active";

type User = {
  id: string; email: string; full_name: string; role: Role;
  verification_status: string; country_of_residence: string | null; country_of_origin: string | null;
  created_at: string; trust_score: number; avatar_url: string | null; bio: string | null;
  is_verified_mentor: boolean; preferred_language: string | null;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", role: "" as Role | "", verification_status: "" });

  const limit = 20;

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (roleFilter !== "all") params.set("role", roleFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (q) params.set("search", q);
        params.set("limit", String(limit));
        params.set("page", String(page));
        const res = await authFetch(`/api/admin/users?${params}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setUsers(data.users ?? []);
        setTotal(data.total ?? 0);
        setErr(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [q, roleFilter, statusFilter, page]);

  const totalPages = Math.ceil(total / limit);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    try {
      const res = await authFetch(`/api/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ verification_status: status }) });
      if (!res.ok) throw new Error("Failed");
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, verification_status: status } : u));
    } catch { /* ignore */ } finally { setBusyId(null); }
  }

  async function verifyUser(id: string) {
    setBusyId(id);
    try {
      const res = await authFetch(`/api/admin/users/${id}/verify`, { method: "POST" });
      if (res.ok) setUsers((prev) => prev.map((u) => u.id === id ? { ...u, verification_status: "verified" } : u));
    } catch { /* ignore */ } finally { setBusyId(null); }
  }

  async function deleteUser(id: string) {
    setBusyId(id);
    try {
      const res = await authFetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch { /* ignore */ } finally { setBusyId(null); }
  }

  async function saveEdit() {
    if (!editUser) return;
    setBusyId(editUser.id);
    try {
      const body: Record<string, string> = {};
      if (editForm.full_name !== editUser.full_name) body.full_name = editForm.full_name;
      if (editForm.email !== editUser.email) body.email = editForm.email;
      if (editForm.role && editForm.role !== editUser.role) body.role = editForm.role;
      if (editForm.verification_status !== editUser.verification_status) body.verification_status = editForm.verification_status;
      if (Object.keys(body).length === 0) { setEditUser(null); return; }
      const res = await authFetch(`/api/admin/users/${editUser.id}`, { method: "PATCH", body: JSON.stringify(body) });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === editUser.id ? { ...u, ...body } : u));
        setEditUser(null);
      }
    } catch { /* ignore */ } finally { setBusyId(null); }
  }

  async function doBulkAction(action: string) {
    if (selected.size === 0) return;
    setBulkAction(action);
    try {
      const res = await authFetch("/api/admin/users/bulk-action", {
        method: "POST",
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      if (res.ok) {
        if (action === "delete") setUsers((prev) => prev.filter((u) => !selected.has(u.id)));
        else setUsers((prev) => prev.map((u) => selected.has(u.id) ? { ...u, verification_status: action === "suspend" ? "rejected" : "verified" } : u));
        setSelected(new Set());
        setBulkAction(null);
      }
    } catch { /* ignore */ } finally { setBulkAction(null); }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleSelectAll() {
    if (selectAll) { setSelected(new Set()); setSelectAll(false); }
    else { setSelected(new Set(users.map((u) => u.id))); setSelectAll(true); }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink-900">Users</h1>
          <p className="text-sm text-ink-600 mt-1">{total.toLocaleString()} total users · page {page} of {totalPages}</p>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 bg-cream-100 rounded-lg px-3 py-1.5 text-sm">
            <span className="text-ink-600">{selected.size} selected</span>
            <button onClick={() => doBulkAction("verify")} disabled={!!bulkAction} className="btn-ghost text-xs !py-1 border border-cream-300">
              {bulkAction === "verify" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Verify
            </button>
            <button onClick={() => doBulkAction("suspend")} disabled={!!bulkAction} className="btn-ghost text-xs !py-1 border border-cream-300 text-red-600">
              Suspend
            </button>
            <button onClick={() => doBulkAction("delete")} disabled={!!bulkAction} className="btn-ghost text-xs !py-1 border-red-300 text-red-600">
              <Trash2 size={12} /> Delete
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="input pl-9 text-sm" placeholder="Search name or email" />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as Role | "all"); setPage(1); }} className="input text-sm max-w-[140px]">
          <option value="all">All roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="student">Student</option>
          <option value="mentor">Mentor</option>
          <option value="employer">Employer</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }} className="input text-sm max-w-[140px]">
          <option value="all">All statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {err && <div className="card border-red-300 text-sm text-red-600"><AlertTriangle size={14} className="inline mr-1" />{err}</div>}

      <div className="card !p-0 overflow-x-auto">
        {loading ? (
          <div className="text-center py-12 text-ink-500"><Loader2 size={20} className="animate-spin mx-auto mb-2" /> Loading users...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-cream-100 border-b border-cream-200">
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-ink-600">
                <th className="px-4 py-3 w-8"><input type="checkbox" checked={selectAll && users.length > 0} onChange={toggleSelectAll} className="w-4 h-4 accent-clay-500" /></th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3 hidden sm:table-cell">Role</th>
                <th className="px-4 py-3 hidden lg:table-cell">Country</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden md:table-cell">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {users.map((u) => (
                <tr key={u.id} className={`hover:bg-cream-100 ${selected.has(u.id) ? "bg-clay-500/5" : ""}`}>
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} className="w-4 h-4 accent-clay-500" /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-clay-500 text-white flex items-center justify-center text-xs font-medium shrink-0">
                        {u.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5">
                          {u.full_name}
                          {(u.verification_status === "verified" || u.is_verified_mentor) && <ShieldCheck size={12} className="text-leaf-600" />}
                        </p>
                        <p className="text-xs text-ink-500 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell"><RoleChip role={u.role} /></td>
                  <td className="px-4 py-3 text-sm text-ink-700 hidden lg:table-cell">{u.country_of_residence ?? u.country_of_origin ?? "—"}</td>
                  <td className="px-4 py-3"><StatusChip status={u.verification_status} /></td>
                  <td className="px-4 py-3 text-xs text-ink-500 hidden md:table-cell">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {u.verification_status === "pending" && (
                        <button onClick={() => verifyUser(u.id)} title="Verify" disabled={busyId === u.id} className="p-1.5 rounded-md text-leaf-600 hover:bg-leaf-500/10 transition">
                          {busyId === u.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                        </button>
                      )}
                      {u.verification_status !== "rejected" ? (
                        <button onClick={() => updateStatus(u.id, "rejected")} title="Suspend" disabled={busyId === u.id} className="p-1.5 rounded-md text-red-600 hover:bg-red-500/10 transition">
                          <Ban size={14} />
                        </button>
                      ) : (
                        <button onClick={() => updateStatus(u.id, "pending")} title="Reinstate" disabled={busyId === u.id} className="p-1.5 rounded-md text-leaf-600 hover:bg-leaf-500/10 transition">
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      <button onClick={() => setEditUser(u)} className="p-1.5 rounded-md text-ink-500 hover:bg-cream-200 transition" title="Edit">
                        <UserCog size={14} />
                      </button>
                      {u.role !== "super_admin" && (
                        <button onClick={() => deleteUser(u.id)} disabled={busyId === u.id} className="p-1.5 rounded-md text-red-600 hover:bg-red-500/10 transition" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-ink-500">No users match these filters.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-ghost text-sm border border-cream-300 !py-1.5"><ChevronLeft size={14} /> Previous</button>
          <span className="text-sm text-ink-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-ghost text-sm border border-cream-300 !py-1.5">Next <ChevronRight size={14} /></button>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setEditUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg font-semibold text-ink-900">Edit User</h2>
            <div className="space-y-3">
              <label className="block text-xs font-medium text-ink-600">Full Name</label>
              <input value={editForm.full_name || editUser.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                className="input text-sm w-full" />
              <label className="block text-xs font-medium text-ink-600">Email</label>
              <input value={editForm.email || editUser.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="input text-sm w-full" />
              <label className="block text-xs font-medium text-ink-600">Role</label>
              <select value={editForm.role || editUser.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                className="input text-sm w-full">
                <option value="student">Student</option>
                <option value="mentor">Mentor</option>
                <option value="employer">Employer</option>
                <option value="admin">Admin</option>
              </select>
              <label className="block text-xs font-medium text-ink-600">Status</label>
              <select value={editForm.verification_status || editUser.verification_status} onChange={(e) => setEditForm({ ...editForm, verification_status: e.target.value })}
                className="input text-sm w-full">
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditUser(null)} className="btn-ghost text-sm border border-cream-300">Cancel</button>
              <button onClick={saveEdit} disabled={busyId === editUser.id} className="btn-accent text-sm">
                {busyId === editUser.id ? <Loader2 size={14} className="animate-spin" /> : null} Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleChip({ role }: { role: Role }) {
  const map: Record<string, string> = {
    super_admin: "!bg-red-500/15 !text-red-600", admin: "!bg-red-500/15 !text-red-600",
    student: "badge-clay", mentor: "badge-verified", employer: "!bg-amber-500/15 !text-amber-500",
  };
  return <span className={`badge ${map[role] ?? ""} capitalize`}>{role.replace("_", " ")}</span>;
}

function StatusChip({ status }: { status: string }) {
  if (status === "verified") return <span className="badge badge-verified">Verified</span>;
  if (status === "pending")  return <span className="badge !bg-amber-500/15 !text-amber-500">Pending</span>;
  return <span className="badge !bg-red-500/15 !text-red-600">{status === "rejected" ? "Suspended" : status}</span>;
}
