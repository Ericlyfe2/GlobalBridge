"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { login } from "@/lib/auth";
import { roleHome } from "@/lib/roles";

function GoogleMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.5-5.2l-6.2-5.3A12 12 0 0 1 12.7 28.5l-6.5 5A20 20 0 0 0 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.5l6.2 5.3C37 41 44 36 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(form.email, form.password);
      window.location.href = roleHome(localStorage.getItem("user-role"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-display font-semibold text-ink-900">Welcome back</h1>
      <p className="mt-2 text-ink-600">Sign in to continue your journey.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input pl-10"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-sm font-medium text-ink-700">Password</label>
            <Link href="/forgot-password" className="text-xs text-clay-600 hover:underline">Forgot?</Link>
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input pl-10"
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-md bg-red-500/10 border border-red-500/25 text-sm text-red-600">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-accent w-full disabled:opacity-50">
          {loading ? "Signing in..." : "Sign in"} <ArrowRight size={16} />
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-cream-200" />
        <span className="text-xs text-ink-500">OR</span>
        <div className="flex-1 h-px bg-cream-200" />
      </div>

      <button className="btn-ghost border border-cream-300 text-sm w-full justify-center">
        <GoogleMark /> Continue with Google
      </button>

      <p className="mt-8 text-center text-sm text-ink-600">
        No account?{" "}
        <Link href="/register" className="text-clay-600 font-medium hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
