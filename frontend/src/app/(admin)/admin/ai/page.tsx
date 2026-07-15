"use client";

import { useEffect, useState } from "react";
import { Bot, Save, Sparkles, ShieldAlert, MessageSquare, ThumbsUp, Activity, BarChart3, Eye, Loader2, AlertTriangle } from "lucide-react";
import { authFetch } from "@/lib/auth";

type AIStats = {
  usage: { total_requests: number; avg_tokens: number; avg_response_time: number; error_rate: number };
  feedback: { avg_rating: number; total_feedback: number };
  conversations: number;
  modelUsage: { feature: string; count: number }[];
};

type Conversation = {
  id: string; title: string; user_name: string; user_email: string; message_count: number; created_at: string;
};

export default function AIConfigPage() {
  const [stats, setStats] = useState<AIStats | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "conversations" | "feedback">("overview");

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await authFetch("/api/admin/ai/stats", { signal: ctrl.signal }, 15000);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setStats(data);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setConvLoading(true);
    (async () => {
      try {
        const res = await authFetch("/api/admin/ai/conversations?limit=20", { signal: ctrl.signal });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setConversations(data.conversations ?? []);
      } catch { /* ignore */ } finally { setConvLoading(false); }
    })();
    return () => ctrl.abort();
  }, []);

  const metrics = stats ? [
    { label: "Total Requests", value: stats.usage.total_requests?.toLocaleString() ?? "0", icon: Activity, tone: "clay" },
    { label: "Avg Response Time", value: `${stats.usage.avg_response_time ?? 0}ms`, icon: BarChart3, tone: "leaf" },
    { label: "Avg Rating", value: `${stats.feedback.avg_rating ?? 0}/5`, icon: ThumbsUp, tone: "leaf" },
    { label: "Error Rate", value: `${stats.usage.error_rate ?? 0}%`, icon: AlertTriangle, tone: stats.usage.error_rate > 5 ? "red" : "clay" },
    { label: "Conversations", value: stats.conversations?.toLocaleString() ?? "0", icon: MessageSquare, tone: "purple" },
    { label: "Feedback Count", value: stats.feedback.total_feedback?.toLocaleString() ?? "0", icon: ThumbsUp, tone: "amber" },
  ] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink-900 flex items-center gap-2">
            <Bot className="text-clay-500" /> AI Control Center
          </h1>
          <p className="text-sm text-ink-600 mt-1">Monitor AI usage, conversations, and performance.</p>
        </div>
        <div className="flex gap-1 bg-cream-100 rounded-lg p-0.5">
          {(["overview", "conversations", "feedback"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition ${activeTab === tab ? "bg-white shadow-sm text-ink-900" : "text-ink-500 hover:text-ink-700"}`}
            >{tab}</button>
          ))}
        </div>
      </header>

      {err && <div className="card border-red-300 text-sm text-red-600"><AlertTriangle size={14} className="inline mr-1" />{err}</div>}

      {activeTab === "overview" && (
        <>
          {metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {metrics.map((m) => (
                <div key={m.label} className="card">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-ink-500">{m.label}</p>
                    <m.icon size={14} className={m.tone === "leaf" ? "text-leaf-600" : m.tone === "red" ? "text-red-600" : m.tone === "purple" ? "text-purple-600" : "text-clay-500"} />
                  </div>
                  <p className="text-xl sm:text-2xl font-display font-semibold text-ink-900 mt-2">{m.value}</p>
                </div>
              ))}
            </div>
          )}

          {stats && stats.modelUsage.length > 0 && (
            <div className="card">
              <h2 className="font-display text-base sm:text-lg font-semibold text-ink-900 mb-4">Feature Usage</h2>
              <div className="space-y-2">
                {stats.modelUsage.map((m) => (
                  <div key={m.feature} className="flex items-center justify-between text-sm">
                    <span className="text-ink-700 capitalize">{m.feature.replace(/_/g, " ")}</span>
                    <span className="font-semibold text-ink-900">{m.count.toLocaleString()} requests</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!stats && !err && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card animate-pulse"><div className="h-4 w-20 bg-cream-200 rounded" /><div className="mt-3 h-8 w-16 bg-cream-200 rounded" /></div>)}
            </div>
          )}
        </>
      )}

      {activeTab === "conversations" && (
        <div className="card !p-0 overflow-x-auto">
          {convLoading ? (
            <div className="text-center py-12 text-ink-500"><Loader2 size={20} className="animate-spin mx-auto mb-2" /> Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-ink-500"><MessageSquare size={28} className="mx-auto opacity-40 mb-2" /><p className="text-sm">No conversations yet.</p></div>
          ) : (
            <table className="w-full">
              <thead className="bg-cream-100 border-b border-cream-200">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-ink-600">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3 hidden sm:table-cell">User</th>
                  <th className="px-4 py-3 hidden md:table-cell">Messages</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {conversations.map((c) => (
                  <tr key={c.id} className="hover:bg-cream-100">
                    <td className="px-4 py-3 text-sm font-medium text-ink-900">{c.title || "Untitled"}</td>
                    <td className="px-4 py-3 text-sm text-ink-700 hidden sm:table-cell">{c.user_name || c.user_email || "Unknown"}</td>
                    <td className="px-4 py-3 text-sm text-ink-500 hidden md:table-cell">{c.message_count ?? 0}</td>
                    <td className="px-4 py-3 text-xs text-ink-500">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1.5 rounded-md text-ink-500 hover:bg-cream-200" title="View"><Eye size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "feedback" && (
        <div className="card text-center py-12 text-ink-500">
          <ThumbsUp size={28} className="mx-auto opacity-40 mb-2" />
          <p className="text-sm">Feedback analytics will appear here.</p>
          <p className="text-xs text-ink-400 mt-1">Total feedback collected: {stats?.feedback.total_feedback ?? 0}</p>
          {stats && <p className="text-lg font-semibold text-ink-900 mt-2">Average Rating: {stats.feedback.avg_rating}/5</p>}
        </div>
      )}
    </div>
  );
}
