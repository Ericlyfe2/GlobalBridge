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
  {
    id: "r6", serviceId: "visa", serviceIndex: "01", serviceTitleKey: "landing.reviews.r1.serviceTitle",
    name: "Mei L.", route: "Shanghai → Toronto",
    quoteKey: "landing.reviews.r6.quote",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop",
    rating: 5,
  },
  {
    id: "r7", serviceId: "jobs", serviceIndex: "04", serviceTitleKey: "landing.reviews.r4.serviceTitle",
    name: "Diego M.", route: "Lima → Madrid",
    quoteKey: "landing.reviews.r7.quote",
    avatar: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=300&auto=format&fit=crop",
    rating: 4,
  },
  {
    id: "r8", serviceId: "housing", serviceIndex: "02", serviceTitleKey: "landing.reviews.r2.serviceTitle",
    name: "Fatima Z.", route: "Cairo → Amsterdam",
    quoteKey: "landing.reviews.r8.quote",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&auto=format&fit=crop",
    rating: 5,
  },
  {
    id: "r9", serviceId: "mentorship", serviceIndex: "03", serviceTitleKey: "landing.reviews.r3.serviceTitle",
    name: "Emeka U.", route: "Lagos → Manchester",
    quoteKey: "landing.reviews.r9.quote",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop",
    rating: 5,
  },
  {
    id: "r10", serviceId: "life-support", serviceIndex: "05", serviceTitleKey: "landing.reviews.r5.serviceTitle",
    name: "Sofia R.", route: "São Paulo → Lisbon",
    quoteKey: "landing.reviews.r10.quote",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=300&auto=format&fit=crop",
    rating: 4,
  },
  {
    id: "r11", serviceId: "visa", serviceIndex: "01", serviceTitleKey: "landing.reviews.r1.serviceTitle",
    name: "Arjun P.", route: "Delhi → Melbourne",
    quoteKey: "landing.reviews.r11.quote",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop",
    rating: 5,
  },
  {
    id: "r12", serviceId: "jobs", serviceIndex: "04", serviceTitleKey: "landing.reviews.r4.serviceTitle",
    name: "Yuki T.", route: "Tokyo → San Francisco",
    quoteKey: "landing.reviews.r12.quote",
    avatar: "https://images.unsplash.com/photo-1521119989659-a83eee488004?q=80&w=300&auto=format&fit=crop",
    rating: 5,
  },
];
