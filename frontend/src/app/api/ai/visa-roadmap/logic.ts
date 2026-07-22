// Pure helpers for the Visa Roadmap route. Kept out of `route.ts` because
// Next.js App Router only allows HTTP-method exports from a route module.

export type Phase = { id: string; title: string; timeframe: string; cost: string; documents: string[]; tip: string };
export type Roadmap = { title: string; totalWeeks: number; phases: Phase[] };

export function extractJson(text: string): unknown | null {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch { return null; }
  }
}

export function mockFallback(origin: string, destination: string, purpose: string): Roadmap {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const purposeLabel = purpose === "work" ? "Work" : purpose === "settle" ? "Settlement" : "Study";
  const phases: Phase[] = purpose === "work"
    ? [
        { id: "offer",   title: "Secure a job offer & sponsorship", timeframe: "Weeks 1–6",  cost: "Varies",     documents: ["CV / resume", "Reference letters", "Job offer letter"], tip: "Target employers with a proven visa-sponsorship track record." },
        { id: "eligib",  title: "Confirm visa eligibility",         timeframe: "Weeks 6–8",  cost: "$0",         documents: ["Passport", "Qualification certificates"], tip: "Check the destination's skilled-worker occupation list first." },
        { id: "docs",    title: "Gather & certify documents",       timeframe: "Weeks 8–11", cost: "$100–$400",  documents: ["Proof of funds", "Police clearance", "Medical exam"], tip: "Start police-clearance requests early — they can take weeks." },
        { id: "apply",   title: "Submit work-visa application",     timeframe: "Weeks 11–13", cost: "$200–$1,500", documents: ["Sponsorship certificate", "Biometrics"], tip: "Save a copy of every submitted document as PDF." },
        { id: "decision",title: "Decision & biometrics",            timeframe: "Weeks 13–18", cost: "$85",        documents: ["Appointment confirmation"], tip: "Book your biometrics appointment the moment it's offered." },
        { id: "arrive",  title: "Travel & settle in",               timeframe: "Weeks 18–20", cost: "$500–$2,000", documents: ["Visa vignette", "Accommodation proof"], tip: "Use GlobalBridge's Toolkit to set up banking and a SIM on arrival." },
      ]
    : purpose === "settle"
      ? [
          { id: "assess",  title: "Assess residency pathway",       timeframe: "Weeks 1–4",   cost: "$0",        documents: ["Passport", "Current visa"], tip: "Points-based routes reward language scores and work history." },
          { id: "lang",    title: "Language & qualification proof",  timeframe: "Weeks 4–10",  cost: "$200–$350", documents: ["Language test result", "Credential assessment"], tip: "Book the language test early; slots fill up fast." },
          { id: "express", title: "Enter the immigration pool",      timeframe: "Weeks 10–12", cost: "$0",        documents: ["Profile submission"], tip: "Keep your profile updated — scores change with each draw." },
          { id: "invite",  title: "Receive invitation & apply",      timeframe: "Weeks 12–24", cost: "$800–$1,500", documents: ["Proof of funds", "Police clearance", "Medical exam"], tip: "Respond within the deadline; invitations expire." },
          { id: "land",    title: "Confirm residency & land",        timeframe: "Weeks 24–30", cost: "$500+",     documents: ["Confirmation of residency", "Landing forms"], tip: "Register for healthcare and a tax number in your first week." },
        ]
      : [
          { id: "choose",  title: "Choose program & get admission", timeframe: "Weeks 1–8",   cost: "$50–$150/app", documents: ["Transcripts", "Statement of purpose", "Reference letters"], tip: "Apply to a safety, a match, and a reach school." },
          { id: "offer",   title: "Accept offer & pay deposit",     timeframe: "Weeks 8–10",  cost: "$200–$2,000",  documents: ["Acceptance letter", "Tuition deposit receipt"], tip: "Keep the official acceptance letter — the visa needs it." },
          { id: "funds",   title: "Prove funds & finances",         timeframe: "Weeks 10–12", cost: "$0",           documents: ["Bank statements", "Scholarship / sponsor letter"], tip: "Funds usually must sit in the account for a minimum period." },
          { id: "apply",   title: "Submit study-visa application",  timeframe: "Weeks 12–14", cost: "$150–$500",    documents: ["Passport", "Acceptance letter", "Proof of funds", "Photos"], tip: "Double-check photo specs — wrong sizing is a top rejection reason." },
          { id: "bio",     title: "Biometrics & interview",         timeframe: "Weeks 14–18", cost: "$85",          documents: ["Appointment letter", "Application summary"], tip: "Rehearse your study plan; interviews test genuine intent." },
          { id: "travel",  title: "Travel & arrival setup",         timeframe: "Weeks 18–20", cost: "$500–$2,000",  documents: ["Visa", "Accommodation proof", "Enrolment confirmation"], tip: "Sort housing before you fly, and verify listings with Scam Shield." },
        ];

  return {
    title: `${purposeLabel} visa roadmap: ${cap(origin)} → ${cap(destination)}`,
    totalWeeks: purpose === "settle" ? 30 : 20,
    phases,
  };
}
