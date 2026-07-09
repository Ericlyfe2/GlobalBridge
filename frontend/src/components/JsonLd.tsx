// Structured data (JSON-LD) for the landing page — helps search engines
// understand the organization and enable sitelinks search.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://globalbridge.app";

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "GlobalBridge",
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.svg`,
      description:
        "AI-powered platform for international students and immigrants. Verified visa guidance, housing, mentorship, jobs.",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "GlobalBridge",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
    },
  ],
};

export function JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
