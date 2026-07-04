export type ReviewData = {
  id: string;
  serviceId: string;
  serviceIndex: string;
  serviceTitleKey: string;
  name: string;
  route: string;
  quoteKey: string;
  avatar: string;
  rating: number;
};

export const reviews: ReviewData[] = [
  {
    id: "r1", serviceId: "visa", serviceIndex: "01", serviceTitleKey: "landing.reviews.r1.serviceTitle",
    name: "Aiyana R.", route: "Manila → Vancouver",
    quoteKey: "landing.reviews.r1.quote",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=300&auto=format&fit=crop",
    rating: 5,
  },
  {
    id: "r2", serviceId: "housing", serviceIndex: "02", serviceTitleKey: "landing.reviews.r2.serviceTitle",
    name: "Tomás V.", route: "Bogotá → Berlin",
    quoteKey: "landing.reviews.r2.quote",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop",
    rating: 5,
  },
  {
    id: "r3", serviceId: "mentorship", serviceIndex: "03", serviceTitleKey: "landing.reviews.r3.serviceTitle",
    name: "Hana K.", route: "Osaka → Dublin",
    quoteKey: "landing.reviews.r3.quote",
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=300&auto=format&fit=crop",
    rating: 5,
  },
  {
    id: "r4", serviceId: "jobs", serviceIndex: "04", serviceTitleKey: "landing.reviews.r4.serviceTitle",
    name: "Priya N.", route: "Chennai → Boston",
    quoteKey: "landing.reviews.r4.quote",
    avatar: "https://images.unsplash.com/photo-1548142813-c348350df52b?q=80&w=300&auto=format&fit=crop",
    rating: 4,
  },
  {
    id: "r5", serviceId: "life-support", serviceIndex: "05", serviceTitleKey: "landing.reviews.r5.serviceTitle",
    name: "Kwame O.", route: "Accra → Sydney",
    quoteKey: "landing.reviews.r5.quote",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=300&auto=format&fit=crop",
    rating: 5,
  },
];
