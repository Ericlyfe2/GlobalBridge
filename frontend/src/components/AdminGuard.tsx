"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed] = useState(() => {
    try { return localStorage.getItem("user-role") === "admin"; } catch { return false; }
  });

  useEffect(() => {
    if (!authed) router.replace("/dashboard");
  }, [authed, router]);

  if (!authed) return null;
  return <>{children}</>;
}
