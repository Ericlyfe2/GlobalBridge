"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from "lucide-react";

type Tone = "success" | "error" | "info" | "warning";

export type Toast = {
  id: string;
  tone: Tone;
  title: string;
  body?: string;
  durationMs?: number;
};

type Ctx = {
  push: (t: Omit<Toast, "id">) => void;
  success: (title: string, body?: string) => void;
  error:   (title: string, body?: string) => void;
  info:    (title: string, body?: string) => void;
  warning: (title: string, body?: string) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${++toastCounter}`;
    const toast: Toast = { id, durationMs: 3500, ...t };
    setToasts((arr) => [...arr, toast]);
    if (toast.durationMs && toast.durationMs > 0) {
      setTimeout(() => remove(id), toast.durationMs);
    }
  }, [remove]);

  const value: Ctx = {
    push,
    success: (title, body) => push({ tone: "success", title, body }),
    error:   (title, body) => push({ tone: "error",   title, body, durationMs: 6000 }),
    info:    (title, body) => push({ tone: "info",    title, body }),
    warning: (title, body) => push({ tone: "warning", title, body }),
  };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
        className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const meta = {
    success: { Icon: CheckCircle2, bg: "bg-leaf-500/15 text-leaf-600",  border: "border-leaf-500/40" },
    error:   { Icon: XCircle,      bg: "bg-red-500/15 text-red-600",    border: "border-red-500/40" },
    info:    { Icon: Info,         bg: "bg-sky-500/15 text-sky-600",    border: "border-sky-500/40" },
    warning: { Icon: AlertTriangle,bg: "bg-amber-500/15 text-amber-500", border: "border-amber-500/40" },
  }[toast.tone];

  return (
    <div
      className={`pointer-events-auto rounded-lg border ${meta.border} bg-[var(--color-surface)] shadow-lg overflow-hidden transition-all duration-200 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      role="status"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${meta.bg}`}>
          <meta.Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-900">{toast.title}</p>
          {toast.body && <p className="text-xs text-ink-600 mt-0.5">{toast.body}</p>}
        </div>
        <button onClick={onClose} aria-label="Dismiss" className="p-1 rounded hover:bg-cream-200 text-ink-500 shrink-0">
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
