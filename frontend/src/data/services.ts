export type ServiceBullet = {
  key: string;
};

export type ServiceData = {
  id: string;
  index: string;
  titleKey: string;
  dekKey: string;
  detailKey: string;
  bullets: ServiceBullet[];
  variant: "hero" | "shard" | "drift" | "compact" | "wide";
  side: "left" | "right";
  image: string;
};

export const services: ServiceData[] = [
  {
    id: "visa",
    index: "01",
    titleKey: "landing.visa.title",
    dekKey: "landing.visa.dek",
    detailKey: "landing.visa.detail",
    bullets: [
      { key: "landing.visa.bullet1" },
      { key: "landing.visa.bullet2" },
      { key: "landing.visa.bullet3" },
    ],
    variant: "shard",
    side: "right",
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "housing",
    index: "02",
    titleKey: "landing.housing.title",
    dekKey: "landing.housing.dek",
    detailKey: "landing.housing.detail",
    bullets: [
      { key: "landing.housing.bullet1" },
      { key: "landing.housing.bullet2" },
      { key: "landing.housing.bullet3" },
    ],
    variant: "drift",
    side: "left",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "jobs",
    index: "04",
    titleKey: "landing.jobs.title",
    dekKey: "landing.jobs.dek",
    detailKey: "landing.jobs.detail",
    bullets: [
      { key: "landing.jobs.bullet1" },
      { key: "landing.jobs.bullet2" },
      { key: "landing.jobs.bullet3" },
    ],
    variant: "shard",
    side: "right",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1200&auto=format&fit=crop",
  },
];

export const mentorshipData = {
  index: "03",
  titleKey: "landing.mentorship.title",
  dekKey: "landing.mentorship.dek",
  detailKey: "landing.mentorship.detail",
};

export const lifeSupportData = {
  index: "05",
  titleKey: "landing.lifeSupport.title",
  dekKey: "landing.lifeSupport.dek",
  detailKey: "landing.lifeSupport.detail",
  tools: [
    { labelKey: "landing.lifeSupport.tool1", noteKey: "landing.lifeSupport.tool1Note", sos: false },
    { labelKey: "landing.lifeSupport.tool2", noteKey: "landing.lifeSupport.tool2Note", sos: false },
    { labelKey: "landing.lifeSupport.tool3", noteKey: "landing.lifeSupport.tool3Note", sos: false },
    { labelKey: "landing.lifeSupport.tool4", noteKey: "landing.lifeSupport.tool4Note", sos: true },
  ],
};
