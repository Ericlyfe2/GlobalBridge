"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck, MoreVertical, Ban, CheckCircle2, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/auth";

type Role = "student" | "mentor" | "employer" | "admin";

type User = {
  id: string; email: string; full_name: string; role: Role;
  verification_status: string; country_of_residence: string | null;
  created_at: string; trust_score: number;
  is_verified_mentor: boolean;
};

type StatusFilter = "all" | "pending" | "verified" | "suspended";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (roleFilter !== "all") params.set("role", roleFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (q) params.set("search", q);
        params.set("limit", "100");
        const res = await authFetch(`/api/users?${params}`, { signal: ctrl.signal });
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
  }, [q, roleFilter, statusFilter]);

  async function updateStatus(id: string, status: string) {
    try {
      const res = await authFetch(`/api/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, verification_status: status } : u));
    } catch { /* ignore */ }
  }

  async function verifyUser(id: string) {
    try {
      const res = await authFetch(`/api/users/${id}/verify`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to verify");
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, verification_status: "verified" } : u));
    } catch { /* ignore */ }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900">Users</h1>
          <p className="text-sm text-ink-600 mt-1">{total} total users</p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9 text-sm" placeholder="Search name or email" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | "all")} className="input text-sm max-w-[160px]">
          <option value="all">All roles</option>
          <option value="student">Student</option>
          <option value="mentor">Mentor</option>
          <option value="employer">Employer</option>
          <option value="admin">Admin</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="input text-sm max-w-[160px]">
          <option value="all">All statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {err && (
        <div className="card border-red-300 text-sm text-red-600">
          Couldn&apos;t load users: {err}
        </div>
      )}

      <div className="card !p-0 overflow-x-auto">
        {loading ? (
          <div className="text-center py-12 text-ink-500">
            <Loader2 size={20} className="animate-spin mx-auto mb-2" /> Loading users...
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-cream-100 border-b border-cream-200">
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-ink-600">
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Country</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-cream-100">
                  <td className="px-5 py-3">
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
                  <td className="px-5 py-3"><RoleChip role={u.role} /></td>
                  <td className="px-5 py-3 text-sm text-ink-700">{u.country_of_residence ?? "—"}</td>
                  <td className="px-5 py-3"><StatusChip status={u.verification_status} /></td>
                  <td className="px-5 py-3 text-xs text-ink-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {u.verification_status === "pending" && (
                        <button onClick={() => verifyUser(u.id)} title="Verify" className="p-1.5 rounded-md text-leaf-600 hover:bg-leaf-500/10 transition" >
                          <ShieldCheck size={14} />
                        </button>
                      )}
                      {u.verification_status !== "rejected" ? (
                        <button onClick={() => updateStatus(u.id, "rejected")} title="Suspend" className="p-1.5 rounded-md text-red-600 hover:bg-red-500/10 transition">
                          <Ban size={14} />
                        </button>
                      ) : (
                        <button onClick={() => updateStatus(u.id, "pending")} title="Reinstate" className="p-1.5 rounded-md text-leaf-600 hover:bg-leaf-500/10 transition">
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      <button className="p-1.5 rounded-md text-ink-500 hover:bg-cream-200 transition">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-ink-500">No users match these filters.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function RoleChip({ role }: { role: Role }) {
  const map: Record<Role, string> = {
    student: "badge-clay", mentor: "badge-verified", employer: "!bg-amber-500/15 !text-amber-500", admin: "!bg-red-500/15 !text-red-600",
  };
  return <span className={`badge ${map[role]} capitalize`}>{role}</span>;
}

function StatusChip({ status }: { status: string }) {
  if (status === "verified") return <span className="badge badge-verified">Verified</span>;
  if (status === "pending")  return <span className="badge !bg-amber-500/15 !text-amber-500">Pending</span>;
  return <span className="badge !bg-red-500/15 !text-red-600">Suspended</span>;
}