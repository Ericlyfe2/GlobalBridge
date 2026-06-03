import { RoleGuard } from "@/components/RoleGuard";

export default function EmployerDashboardLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={["employer"]}>{children}</RoleGuard>;
}
