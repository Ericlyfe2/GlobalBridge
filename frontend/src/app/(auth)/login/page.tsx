import { redirect } from "next/navigation";

// Consolidated: /auth is the canonical auth experience.
export default function LoginRedirect() {
  redirect("/auth?mode=signin");
}
