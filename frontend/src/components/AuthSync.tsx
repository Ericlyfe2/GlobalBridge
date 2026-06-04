"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUser } from "@/lib/auth";

/**
 * Mounted once in the root layout. Syncs cross-tab auth state:
 * when another tab signs out, reflect it here immediately.
 */
export function AuthSync() {
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user && getUser()) {
        import("@/lib/auth").then(({ clearSession }) => clearSession());
      }
    });
    return unsub;
  }, []);

  return null;
}
