"use client";

import { Navbar } from "@/components/Navbar";
import Hero from "@/components/Hero";
import ServiceSection from "@/components/ServiceSection";
import ScrollOrchestrator from "@/components/ScrollOrchestrator";
import VisaChecklist from "@/components/VisaChecklist";
import JobsCard from "@/components/JobsCard";
import MentorshipSection from "@/components/MentorshipSection";
import LifeSupportSection from "@/components/LifeSupportSection";
import ReviewsSection from "@/components/ReviewsSection";
import { Footer } from "@/components/Footer";
import { services } from "@/data/services";
import AirplanePath from "@/components/AirplanePath";

export default function Home() {
  const visa = services.find((s) => s.id === "visa")!;
  const housing = services.find((s) => s.id === "housing")!;
  const jobs = services.find((s) => s.id === "jobs")!;

  return (
    <div className="bg-cream-50">
      <Navbar />
      <Hero />

      <div className="relative">
        <AirplanePath />

        <div
          id="section-visa"
          className="relative z-20 -mt-[100vh] rounded-t-[2.5rem] md:rounded-t-[3.5rem] overflow-visible shadow-[0_-50px_100px_-30px_rgba(15,23,42,0.35)] bg-cream-50"
        >
        <ServiceSection service={visa} disableMaskAnimation={true}>
          <VisaChecklist />
        </ServiceSection>
      </div>

      <ServiceSection service={housing} disableMaskAnimation={true} />
      </div>
      <MentorshipSection />
      <ServiceSection service={jobs}>
        <JobsCard />
      </ServiceSection>
      <LifeSupportSection />
      <ReviewsSection />

      <ScrollOrchestrator />
      <Footer />
    </div>
  );
}
