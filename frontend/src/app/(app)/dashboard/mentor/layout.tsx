import { RoleGuard } from "@/components/RoleGuard";

export default function MentorDashboardLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={["mentor"]}>{children}</RoleGuard>;
}
