"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed] = useState(() => !!getToken());

  useEffect(() => {
    if (!authed) router.replace("/auth?mode=signin");
  }, [authed, router]);

  if (!authed) return null;
  return <>{children}</>;
}
