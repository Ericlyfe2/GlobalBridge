import { RoleGuard } from "@/components/RoleGuard";

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={["student"]}>{children}</RoleGuard>;
}
