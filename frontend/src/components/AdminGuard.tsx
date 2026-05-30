"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    try {
      const role = localStorage.getItem("user-role");
      if (role !== "admin") {
        router.replace("/dashboard");
      } else {
        setAuthed(true);
      }
    } catch {
      router.replace("/dashboard");
    }
  }, [router]);

  if (!authed) return null;
  return <>{children}</>;
}
