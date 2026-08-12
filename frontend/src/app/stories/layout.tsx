import type { Metadata } from "next";

// The stories pages are client components and can't export metadata themselves,
// so this segment layout supplies it.
export const metadata: Metadata = {
  title: "Success Stories",
  description:
    "Real students, real outcomes — verified success stories from GlobalBridge members who landed admissions, scholarships, jobs, and visa-sponsored housing abroad.",
  alternates: { canonical: "/stories" },
};

export default function StoriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
