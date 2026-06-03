import { redirect } from "next/navigation";

// Consolidated: /auth is the canonical auth experience.
export default function RegisterRedirect() {
  redirect("/auth?mode=signup");
}
