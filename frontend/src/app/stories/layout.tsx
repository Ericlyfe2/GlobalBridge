import type { Metadata } from "next";

// The stories pages are client components and can't export metadata themselves,
// so this segment layout supplies it.
export const metadata: Metadata = {
  title: "Success Stories",
  description:
    "Representative success stories from GlobalBridge members — admissions, scholarships, jobs, and housing outcomes. Stories require admin review before they are marked verified.",
  alternates: { canonical: "/stories" },
};

export default function StoriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
