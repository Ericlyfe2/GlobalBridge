"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";

type AdminState = "pending" | "admin" | "denied";

function useAdminCheck(): AdminState {
  // Starts "pending" on both server and client so the first client render
  // matches the SSR output; the real check runs client-only in the effect
  // below (getUser() reads localStorage, which doesn't exist during SSR).
  const [state, setState] = useState<AdminState>("pending");
  useEffect(() => {
    function check() {
      const u = getUser();
      setState(u?.role === "admin" || u?.role === "super_admin" ? "admin" : "denied");
    }
    check();
    window.addEventListener("focus", check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener("focus", check);
      window.removeEventListener("storage", check);
    };
  }, []);
  return state;
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const state = useAdminCheck();

  useEffect(() => {
    if (state === "denied") router.replace("/dashboard");
  }, [state, router]);

  if (state !== "admin") return null;
  return <>{children}</>;
}
