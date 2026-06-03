"use client";

// Smart index: send each user to their own role dashboard.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { roleHome } from "@/lib/roles";

export default function DashboardIndex() {
  const router = useRouter();
  const [home] = useState(() => {
    let role: string | null = null;
    try { role = localStorage.getItem("user-role"); } catch { /* ignore */ }
    return roleHome(role);
  });

  useEffect(() => {
    router.replace(home);
  }, [home, router]);

  return (
    <div className="flex h-full items-center justify-center py-24">
      <Loader2 size={22} className="animate-spin text-emerald-500" />
    </div>
  );
}
