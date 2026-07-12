"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Globe } from "lucide-react";

export type FlagOption = {
  value: string;
  label: string;
  flag?: string;     // ISO-2 code for flag-icons (e.g. "gh", "ng"). Omit for "Other".
};

export function FlagSelect({
  value, options, onChange, placeholder = "Select...", className = "",
}: {
  value: string;
  options: FlagOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          {current?.flag ? (
            <span className={`fi fi-${current.flag} shrink-0`} aria-hidden="true" />
          ) : (
            <Globe size={14} className="text-ink-500 shrink-0" aria-hidden="true" />
          )}
          <span className="truncate text-ink-900">{current?.label ?? placeholder}</span>
        </span>
        <ChevronDown size={14} className={`text-ink-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-cream-200 bg-[var(--color-surface)] shadow-lg py-1"
        >
          {options.map((o) => {
            const isSel = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={isSel}>
                <button
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${
                    isSel ? "bg-clay-500/10 text-ink-900" : "text-ink-700 hover:bg-cream-100"
                  }`}
                >
                  {o.flag ? (
                    <span className={`fi fi-${o.flag} shrink-0`} aria-hidden="true" />
                  ) : (
                    <Globe size={14} className="text-ink-500 shrink-0" aria-hidden="true" />
                  )}
                  <span className="flex-1 truncate">{o.label}</span>
                  {isSel && <Check size={13} className="text-clay-600 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
