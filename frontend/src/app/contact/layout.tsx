import type { Metadata } from "next";

// The contact page is a client component and can't export metadata itself,
// so this segment layout supplies it.
export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the GlobalBridge team for support with visas, housing, mentorship, jobs, or anything about studying and settling abroad.",
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
