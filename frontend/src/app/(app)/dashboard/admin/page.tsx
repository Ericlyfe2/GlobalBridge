"use client";

// Spec route /dashboard/admin. Admin keeps its full /admin/* section, so this
// just gates by role and forwards there.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";

function AdminRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin");
  }, [router]);
  return (
    <div className="flex h-full items-center justify-center py-24">
      <Loader2 size={22} className="animate-spin text-emerald-500" />
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <AdminRedirect />
    </RoleGuard>
  );
}
