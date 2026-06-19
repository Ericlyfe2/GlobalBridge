"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex flex-col">
        <header className="px-8 py-6 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <footer className="px-8 py-6 text-xs text-ink-500">
          &copy; 2025 GlobalBridge
        </footer>
      </div>

      <div className="hidden md:flex relative bg-gradient-to-br from-clay-500 via-clay-600 to-clay-700 text-white p-8 lg:p-12 items-end overflow-hidden">
        <div className="absolute top-0 right-0 w-72 lg:w-96 h-72 lg:h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 lg:w-72 h-64 lg:h-72 bg-slate-900/20 rounded-full blur-3xl" />

        <div className="relative max-w-md">
          <blockquote className="font-display text-2xl lg:text-3xl leading-tight">
            &ldquo;GlobalBridge turned my Canada study permit nightmare into a 30-minute conversation.&rdquo;
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-medium">A</div>
            <div>
              <p className="font-medium text-sm">Amara O.</p>
              <p className="text-xs text-white/85">Lagos &rarr; Toronto &middot; CS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
