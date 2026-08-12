"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { getToken } from "@/lib/auth";

/**
 * Fixed bottom CTA bar for marketing pages, mobile only. The desktop nav's
 * "Get started" button is always visible; on mobile it's hidden behind the
 * hamburger menu, so small-screen visitors otherwise scroll past zero CTAs.
 * Hidden once a session token exists — a signed-in visitor belongs in the
 * app, not funneled back into signup.
 */
export function StickyMobileCTA() {
  const [authed, setAuthed] = useState(true);

  useEffect(() => {
    setAuthed(!!getToken());
  }, []);

  if (authed) return null;

  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 bg-gradient-to-t from-cream-50 via-cream-50/95 to-transparent pointer-events-none">
      <Link
        href="/auth?mode=signup"
        className="pointer-events-auto w-full flex items-center justify-center gap-2 rounded-full bg-clay-500 text-white px-6 py-3.5 font-medium text-sm shadow-lg shadow-clay-900/20 hover:bg-clay-600 transition-colors"
      >
        Start free <ArrowRight size={15} />
      </Link>
    </div>
  );
}
