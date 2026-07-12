import type { Metadata } from "next";

// The auth page is a client component and can't export metadata itself,
// so this segment layout supplies it.
export const metadata: Metadata = {
  title: "Sign in or create your account",
  description:
    "Securely sign in to GlobalBridge or create a free account to access AI visa guidance, verified housing, mentorship, and jobs for studying and settling abroad.",
  alternates: { canonical: "/auth" },
};

export default function AuthPageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
