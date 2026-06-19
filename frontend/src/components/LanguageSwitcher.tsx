"use client";

import { useEffect, useRef, useState } from "react";
import { Languages, Check, Loader2, Search, Globe, ChevronDown } from "lucide-react";
import { useTranslation } from "@/i18n/hooks/useTranslation";

export function LanguageSwitcher({ variant = "icon" }: { variant?: "icon" | "full" }) {
  const { lang, setLang, translating, availableLanguages } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = availableLanguages.find((l) => l.code === lang) ?? availableLanguages[0];

  const filtered = search.trim()
    ? availableLanguages.filter(
        (l) =>
          l.native.toLowerCase().includes(search.toLowerCase()) ||
          l.label.toLowerCase().includes(search.toLowerCase()) ||
          l.code.includes(search.toLowerCase())
      )
    : availableLanguages;

  function handleSelect(code: typeof lang) {
    setLang(code);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={ref} className="relative" data-no-translate>
      {variant === "full" ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Change language"
          className="input w-full flex items-center justify-between gap-2 text-left cursor-pointer"
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className={`fi fi-${current.flag} shrink-0`} aria-hidden="true" />
            <span className="truncate text-sm">{current.native}</span>
            <span className="text-ink-500 text-xs hidden sm:inline">{current.label}</span>
          </span>
          <ChevronDown size={14} className={`text-ink-500 transition ${open ? "rotate-180" : ""}`} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Change language"
          className="p-2 rounded-md text-ink-700 hover:bg-cream-200 transition flex items-center gap-1"
        >
          {translating ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <span className={`fi fi-${current.flag} shrink-0`} aria-hidden="true" />
              <span className="text-xs font-medium hidden sm:inline ml-1">{current.code.toUpperCase()}</span>
            </>
          )}
        </button>
      )}

      {open && (
        <div
          role="menu"
          className={`absolute z-50 rounded-lg border border-cream-200 bg-[var(--color-surface)] shadow-lg py-1 ${
            variant === "full" ? "left-0 right-0 mt-1" : "right-0 mt-2 w-64"
          }`}
        >
          <div className="px-3 pt-2 pb-1 flex items-center gap-2 border-b border-cream-200 mx-2 mb-1">
            <Search size={14} className="text-ink-500 shrink-0" />
            <input
              type="text"
              placeholder="Search languages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400 py-1.5"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-ink-500 text-center">No languages found</p>
            ) : (
              filtered.map((l) => {
                const isActive = lang === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => handleSelect(l.code)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition ${
                      isActive
                        ? "bg-clay-500/10 text-clay-600 font-medium"
                        : "text-ink-700 hover:bg-cream-100"
                    }`}
                  >
                    <span className={`fi fi-${l.flag} shrink-0`} aria-hidden="true" />
                    <span className="flex-1 text-left">
                      <span>{l.native}</span>
                      <span className="text-ink-500 text-xs ml-1.5">{l.label}</span>
                    </span>
                    {isActive && <Check size={14} className="text-clay-500 shrink-0" />}
                    {translating && lang === l.code && (
                      <Loader2 size={14} className="animate-spin text-clay-500 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="px-3 py-2 text-[10px] text-ink-500 border-t border-cream-200 mt-1 flex items-center justify-between">
            <span>AI-powered · {availableLanguages.length} languages</span>
            <Globe size={12} />
          </div>
        </div>
      )}
    </div>
  );
}
