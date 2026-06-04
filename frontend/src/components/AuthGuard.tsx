"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";

function useAuthCheck(): boolean {
  const [authed, setAuthed] = useState(() => !!getToken());
  useEffect(() => {
    function check() { setAuthed(!!getToken()); }
    check();
    window.addEventListener("focus", check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener("focus", check);
      window.removeEventListener("storage", check);
    };
  }, []);
  return authed;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const authed = useAuthCheck();

  useEffect(() => {
    if (!authed) router.replace("/auth?mode=signin");
  }, [authed, router]);

  if (!authed) return null;
  return <>{children}</>;
}
