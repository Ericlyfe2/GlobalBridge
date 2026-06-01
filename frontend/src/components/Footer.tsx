import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-cream-200 bg-cream-100 mt-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 text-sm text-ink-600 max-w-xs">
              Trusted companion for international students and immigrants — before, during, and after their journey.
            </p>
            <p className="mt-6 text-xs text-ink-500">© 2025 GlobalBridge · Group 8 FYP</p>
          </div>

          <FooterCol title="Platform" items={[
            { href: "/opportunities", label: "Opportunities" },
            { href: "/housing", label: "Housing" },
            { href: "/jobs", label: "Jobs" },
            { href: "/assistant", label: "AI Assistant" },
            { href: "/pricing", label: "Pricing" },
          ]} />

          <FooterCol title="Community" items={[
            { href: "/community", label: "Mentors" },
            { href: "/forums", label: "Forums" },
            { href: "/stories", label: "Success Stories" },
            { href: "/scam-alerts", label: "Scam Alerts" },
          ]} />

          <FooterCol title="Resources" items={[
            { href: "/toolkit/cost", label: "Cost Calculator" },
            { href: "/toolkit/banking", label: "Banking Guide" },
            { href: "/toolkit/healthcare", label: "Healthcare" },
            { href: "/toolkit/sos", label: "Emergency SOS" },
          ]} />

          <FooterCol title="Company" items={[
            { href: "/about", label: "About" },
            { href: "/help", label: "Help" },
            { href: "/contact", label: "Contact" },
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
          ]} />
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 className="font-display text-sm font-semibold text-ink-900 mb-3">{title}</h4>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="text-sm text-ink-600 hover:text-clay-600 transition">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
