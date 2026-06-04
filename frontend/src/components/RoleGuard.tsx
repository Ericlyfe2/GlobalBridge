"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { getUser } from "@/lib/auth";
import { roleGuardDecision, type Role } from "@/lib/roles";

function useRoleDecision(allow: Role[]) {
  const [decision, setDecision] = useState<"allow" | "login" | "unauthorized">(() => {
    const user = getUser();
    return roleGuardDecision(user?.role ?? null, allow);
  });

  const recheck = useCallback(() => {
    const user = getUser();
    setDecision(roleGuardDecision(user?.role ?? null, allow));
  }, [allow]);

  useEffect(() => {
    recheck();
    window.addEventListener("focus", recheck);
    window.addEventListener("storage", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      window.removeEventListener("storage", recheck);
    };
  }, [recheck]);

  return decision;
}

export function RoleGuard({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const router = useRouter();
  const decision = useRoleDecision(allow);

  useEffect(() => {
    if (decision === "login") router.replace("/auth?mode=signin");
    else if (decision === "unauthorized") router.replace("/unauthorized");
  }, [decision, router]);

  if (decision !== "allow") return null;
  return <>{children}</>;
}
