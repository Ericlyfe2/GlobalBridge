"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";

function useAdminCheck(): boolean {
  const [isAdmin, setIsAdmin] = useState(() => getUser()?.role === "admin");
  useEffect(() => {
    function check() { setIsAdmin(getUser()?.role === "admin"); }
    check();
    window.addEventListener("focus", check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener("focus", check);
      window.removeEventListener("storage", check);
    };
  }, []);
  return isAdmin;
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAdmin = useAdminCheck();

  useEffect(() => {
    if (!isAdmin) router.replace("/dashboard");
  }, [isAdmin, router]);

  if (!isAdmin) return null;
  return <>{children}</>;
}
