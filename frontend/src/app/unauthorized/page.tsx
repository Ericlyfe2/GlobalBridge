"use client";

import Link from "next/link";
import { useState } from "react";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { roleHome } from "@/lib/roles";

export default function UnauthorizedPage() {
  const [home] = useState(() => {
    let role: string | null = null;
    try { role = localStorage.getItem("user-role"); } catch { /* ignore */ }
    return roleHome(role);
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center dark:bg-gray-950">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
        <ShieldAlert size={30} />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-[#0A2540] dark:text-white">
        Access restricted
      </h1>
      <p className="mt-2 max-w-sm text-sm text-ink-500 dark:text-gray-400">
        You don&apos;t have permission to view this area. It&apos;s reserved for a
        different account type.
      </p>
      <Link
        href={home}
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
      >
        <ArrowLeft size={16} /> Back to your dashboard
      </Link>
    </div>
  );
}
