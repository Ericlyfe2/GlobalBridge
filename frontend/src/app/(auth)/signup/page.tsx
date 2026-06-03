import { redirect } from "next/navigation";

// Spec route /signup → canonical /auth experience.
export default function SignupRedirect() {
  redirect("/auth?mode=signup");
}
