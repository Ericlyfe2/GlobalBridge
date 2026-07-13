"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";

type AuthState = "pending" | "authed" | "anon";

function useAuthCheck(): AuthState {
  // Starts "pending" on both server and client so the first client render
  // matches the SSR output; the real check runs client-only in the effect
  // below (getToken() reads localStorage, which doesn't exist during SSR).
  const [state, setState] = useState<AuthState>("pending");
  useEffect(() => {
    function check() { setState(getToken() ? "authed" : "anon"); }
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

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const state = useAuthCheck();

  useEffect(() => {
    if (state === "anon") router.replace("/auth?mode=signin");
  }, [state, router]);

  if (state !== "authed") return null;
  return <>{children}</>;
}
