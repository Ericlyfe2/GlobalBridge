import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Home, LifeBuoy } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AtlasPortrait } from "@/components/mascot/AtlasPortrait";

// Thank-you pages are post-action confirmations, not content worth ranking —
// keep them out of search results so they don't compete with real pages.
export const metadata: Metadata = {
  title: "Thank You",
  description: "Your message has been received.",
  robots: { index: false, follow: true },
};

const COPY: Record<string, { title: string; body: string; sla?: string }> = {
  contact: {
    title: "Message sent.",
    body: "Thanks for reaching out — a real person on our team will get back to you at the email you gave us.",
    sla: "Most replies go out within 4 hours during business hours (8am–8pm GMT); safety reports are actioned 24/7.",
  },
  default: {
    title: "Thank you.",
    body: "We've got what we need — you'll hear from us shortly.",
  },
};

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const copy = COPY[from ?? "default"] ?? COPY.default;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-leaf-500/15 text-leaf-600 flex items-center justify-center mb-6">
            <CheckCircle2 size={28} />
          </div>

          <h1 className="text-3xl md:text-4xl font-display font-semibold text-ink-900 tracking-tight">
            {copy.title}
          </h1>
          <p className="text-sm text-ink-600 mt-3 leading-relaxed">
            {copy.body}
          </p>
          {copy.sla && (
            <p className="text-xs text-ink-500 mt-2">{copy.sla}</p>
          )}

          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link href="/" className="btn-accent text-sm inline-flex items-center gap-1.5">
              <Home size={14} /> Back home
            </Link>
            <Link href="/help" className="btn-ghost border border-cream-300 text-sm inline-flex items-center gap-1.5">
              <LifeBuoy size={14} /> Help center
            </Link>
          </div>

          <div className="mt-12 flex items-center justify-center gap-3 text-left max-w-xs mx-auto">
            <AtlasPortrait size={40} className="shrink-0" />
            <p className="text-xs text-ink-500 leading-relaxed">
              Atlas here — while you wait, browse verified{" "}
              <Link href="/opportunities" className="text-clay-600 font-medium hover:underline">opportunities</Link>{" "}
              or read a few{" "}
              <Link href="/stories" className="text-clay-600 font-medium hover:underline">success stories</Link>.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
