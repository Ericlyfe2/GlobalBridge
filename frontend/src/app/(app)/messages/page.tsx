"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Send, Search, MoreVertical, Loader2, MessageSquare, LogIn } from "lucide-react";
import { authFetch, getToken, getUser } from "@/lib/auth";

type Conversation = {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_avatar: string | null;
  last_message_at: string;
};

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  conversation_id?: string;
};

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function timeOf(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "now";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

export default function MessagesPage() {
  const [authed] = useState(() => !!getToken());
  const me = getUser();
  const [convos, setConvos] = useState<Conversation[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!authed) { setConvos([]); return; }
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await authFetch("/api/messages/conversations", { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setConvos(data.conversations);
        if (data.conversations[0]) setActive(data.conversations[0].id);
        setErr(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
        setConvos([]);
      }
    })();
    return () => ctrl.abort();
  }, [authed]);

  // Load messages for active conversation
  useEffect(() => {
    if (!active) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await authFetch(`/api/messages/conversations/${active}`, { signal: ctrl.signal });
        const data = await res.json();
        if (res.ok) setMessages(data.messages);
      } catch { /* ignore */ }
    })();
    return () => ctrl.abort();
  }, [active]);

  // WebSocket connection for real-time messages
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number>(0);

  useEffect(() => {
    if (!authed) return;
    const token = getToken();
    if (!token) return;

    function connect() {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = process.env.NEXT_PUBLIC_WS_URL || `${proto}//localhost:4000`;
      const ws = new WebSocket(`${host}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => { reconnectRef.current = 0; };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_message") {
            const msg = data.message as Message;
            if (active && msg.conversation_id === active) {
              setMessages((m) => [...m, msg]);
            }
            // Refresh conversations list to update last_message_at
            setConvos((prev) => prev ? [...prev] : prev);
          }
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        wsRef.current = null;
        const delay = Math.min(1000 * Math.pow(2, reconnectRef.current), 30000);
        reconnectRef.current++;
        setTimeout(connect, delay);
      };

      ws.onerror = () => ws.close();
    }

    connect();
    return () => { wsRef.current?.close(); };
  }, [authed, active]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const activeConvo = convos?.find((c) => c.id === active) ?? null;

  async function send() {
    if (!draft.trim() || !activeConvo) return;
    const body = draft;
    setDraft("");
    const tempId = `local_${Date.now()}`;
    // optimistic
    setMessages((m) => [...m, { id: tempId, sender_id: me?.id ?? "me", body, created_at: new Date().toISOString() }]);
    try {
      const res = await authFetch("/api/messages/send", {
        method: "POST",
        body: JSON.stringify({ recipient_id: activeConvo.partner_id, body }),
      });
      if (!res.ok) {
        // Remove optimistic message on failure
        setMessages((m) => m.filter((msg) => msg.id !== tempId));
      }
    } catch {
      setMessages((m) => m.filter((msg) => msg.id !== tempId));
    }
  }

  // Not signed in
  if (!authed) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 mx-auto rounded-xl bg-clay-500/15 text-clay-600 flex items-center justify-center mb-4">
            <MessageSquare size={22} />
          </div>
          <h1 className="text-xl font-display font-semibold text-ink-900">Sign in to message mentors</h1>
          <p className="text-sm text-ink-600 mt-2">
            Your private conversations with verified mentors live here. Sign in to start.
          </p>
          <Link href="/login" className="btn-accent text-sm mt-4 inline-flex">
            <LogIn size={14} /> Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      <aside className="w-80 border-r border-cream-200 bg-cream-50 flex flex-col">
        <div className="p-4 border-b border-cream-200">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input className="input pl-9 text-sm" placeholder="Search conversations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convos === null && (
            <div className="p-6 text-center text-ink-500 text-sm">
              <Loader2 size={16} className="animate-spin mx-auto mb-2" /> Loading...
            </div>
          )}
          {convos && convos.length === 0 && (
            <div className="p-6 text-center text-sm text-ink-500">
              No conversations yet.{" "}
              <Link href="/community" className="text-clay-600 hover:underline">Find a mentor</Link> to start.
            </div>
          )}
          {(searchQuery && convos
            ? convos.filter((c) => c.partner_name.toLowerCase().includes(searchQuery.toLowerCase()))
            : convos
          )?.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`w-full text-left px-4 py-3 border-b border-cream-200 hover:bg-cream-100 transition flex items-start gap-3 ${
                active === c.id ? "bg-clay-500/5 border-l-2 border-l-clay-500" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-clay-500 to-clay-700 text-white flex items-center justify-center text-sm font-medium shrink-0">
                {initialsOf(c.partner_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <p className="font-medium text-sm text-ink-900 truncate">{c.partner_name}</p>
                  <span className="text-xs text-ink-500 shrink-0">{timeOf(c.last_message_at)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-cream-50">
        {activeConvo ? (
          <>
            <header className="px-6 py-4 border-b border-cream-200 flex items-center justify-between bg-cream-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-clay-500 to-clay-700 text-white flex items-center justify-center text-sm font-medium">
                  {initialsOf(activeConvo.partner_name)}
                </div>
                <div>
                  <p className="font-medium text-ink-900">{activeConvo.partner_name}</p>
                  <p className="text-xs text-leaf-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-leaf-500" /> Verified mentor
                  </p>
                </div>
              </div>
              <button className="p-2 rounded-md hover:bg-cream-200"><MoreVertical size={16} /></button>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {messages.length === 0 && (
                <p className="text-center text-sm text-ink-500 py-8">No messages yet. Say hello 👋</p>
              )}
              {messages.map((m) => (
                <Bubble key={m.id} role={m.sender_id === me?.id ? "me" : "them"}>{m.body}</Bubble>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-cream-200 bg-cream-50">
              <div className="relative">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  className="input pr-12 py-3"
                  placeholder="Type a message..."
                />
                <button
                  onClick={send}
                  disabled={!draft.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-md bg-clay-500 text-white flex items-center justify-center hover:bg-clay-600 disabled:opacity-40"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center px-6">
            <div>
              <MessageSquare size={28} className="mx-auto mb-3 text-ink-400" />
              <p className="text-sm text-ink-500">
                {err ? `Error: ${err}` : "Select a conversation, or find a mentor to start chatting."}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Bubble({ role, children }: { role: "me" | "them"; children: React.ReactNode }) {
  const isMe = role === "me";
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isMe
            ? "bg-clay-500 text-white rounded-tr-sm"
            : "bg-[var(--color-surface)] border border-cream-200 text-ink-900 rounded-tl-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
