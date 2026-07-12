import type { Metadata } from "next";

// The help page is a client component and can't export metadata itself,
// so this segment layout supplies it.
export const metadata: Metadata = {
  title: "Help Center",
  description:
    "Answers and guides for using GlobalBridge — visa support, housing, mentorship, jobs, and the settling-in toolkit for international students and immigrants.",
  alternates: { canonical: "/help" },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
