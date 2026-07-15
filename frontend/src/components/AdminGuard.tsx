"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";

function useAdminCheck(): boolean {
  const [isAdmin, setIsAdmin] = useState(() => {
    const u = getUser();
    return u?.role === "admin" || u?.role === "super_admin";
  });
  useEffect(() => {
    function check() {
      const u = getUser();
      setIsAdmin(u?.role === "admin" || u?.role === "super_admin");
    }
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
