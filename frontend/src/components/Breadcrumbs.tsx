import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { safeJsonLd } from "@/lib/json-ld";

export type Crumb = { label: string; href?: string };

/**
 * Renders a breadcrumb trail and a matching BreadcrumbList JSON-LD block so
 * search engines can show the trail in results, not just users in the UI.
 * The last crumb is always the current page (no href, aria-current).
 */
export function Breadcrumbs({ items, siteUrl = "https://globalbridge.app" }: { items: Crumb[]; siteUrl?: string }) {
  const trail: Crumb[] = [{ label: "Home", href: "/" }, ...items];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${siteUrl}${c.href}` } : {}),
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-6 lg:px-8 pt-6 text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-ink-500">
        {trail.map((c, i) => {
          const isLast = i === trail.length - 1;
          return (
            <li key={c.href ?? c.label} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={12} className="text-ink-400" aria-hidden="true" />}
              {isLast || !c.href ? (
                <span aria-current="page" className="text-ink-700 font-medium">{c.label}</span>
              ) : (
                <Link href={c.href} className="hover:text-clay-600 transition">{c.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
    </nav>
  );
}
