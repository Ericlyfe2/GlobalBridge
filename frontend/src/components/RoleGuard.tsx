"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { roleGuardDecision, type Role } from "@/lib/roles";

/**
 * Client-side role gate. Renders children only when the stored role is in
 * `allow`. Otherwise redirects: missing auth → sign-in, wrong role → /unauthorized.
 * Real data security is enforced by the backend (requireAuth + role claims);
 * this is navigation/UX only.
 */
export function RoleGuard({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const router = useRouter();
  const [decision] = useState(() => {
    let role: string | null = null;
    try { role = localStorage.getItem("user-role"); } catch { /* SSR / blocked storage */ }
    return roleGuardDecision(role, allow);
  });

  useEffect(() => {
    if (decision === "login") router.replace("/auth?mode=signin");
    else if (decision === "unauthorized") router.replace("/unauthorized");
  }, [decision, router]);

  if (decision !== "allow") return null;
  return <>{children}</>;
}
