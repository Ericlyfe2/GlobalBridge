"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { authFetch, getToken } from "@/lib/auth";

type ItemType = "opportunity" | "housing" | "job";

// Module-level cache so every SaveButton shares one fetch + one source of truth.
let cache: Set<string> | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function key(type: ItemType, id: string) { return `${type}:${id}`; }

async function ensureLoaded() {
  if (cache || !getToken()) { cache = cache ?? new Set(); return; }
  if (!loading) {
    loading = (async () => {
      try {
        const res = await authFetch("/api/content/saved");
        const data = await res.json();
        cache = new Set(
          (data.saved as { item_type: ItemType; item_id: string }[]).map((s) => key(s.item_type, s.item_id)),
        );
      } catch {
        cache = new Set();
      }
    })();
  }
  await loading;
}

function notify() { listeners.forEach((fn) => fn()); }

export function SaveButton({ type, id, className = "", label }: { type: ItemType; id: string; className?: string; label?: boolean }) {
  const [, force] = useState(0);
  const k = key(type, id);

  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    listeners.add(rerender);
    ensureLoaded().then(rerender);
    return () => { listeners.delete(rerender); };
  }, [k]);

  const saved = cache?.has(k) ?? false;

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    cache = cache ?? new Set();
    const isSaved = cache.has(k);
    isSaved ? cache.delete(k) : cache.add(k);
    notify();
    if (getToken()) {
      authFetch("/api/content/saved", {
        method: isSaved ? "DELETE" : "POST",
        body: JSON.stringify({ item_type: type, item_id: id }),
      }).catch(() => {});
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={saved ? "Saved" : "Save"}
      className={`transition ${saved ? "text-clay-600" : "text-ink-500 hover:text-clay-600"} ${className}`}
    >
      <Bookmark size={16} className={saved ? "fill-clay-500" : ""} />
      {label && (saved ? "Saved" : "Save")}
    </button>
  );
}
