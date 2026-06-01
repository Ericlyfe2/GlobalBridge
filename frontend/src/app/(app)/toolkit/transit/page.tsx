"use client";

import Link from "next/link";
import { useState } from "react";
import { Bus, ArrowLeft, Bike, Car, Train, CreditCard, Clock, MapPin, Tag } from "lucide-react";

type City = "tor" | "lon" | "ber" | "nyc" | "syd" | "ams";

const cityMeta: Record<City, { label: string; flag: string }> = {
  tor: { label: "Toronto",   flag: "ca" },
  lon: { label: "London",    flag: "gb" },
  ber: { label: "Berlin",    flag: "de" },
  nyc: { label: "New York",  flag: "us" },
  syd: { label: "Sydney",    flag: "au" },
  ams: { label: "Amsterdam", flag: "nl" },
};

type Option = {
  mode: "metro" | "bus" | "bike" | "rideshare" | "rail";
  name: string;
  pass: string;
  student: string;
  card: string;
  cover: string;
};

const data: Record<City, { commute: string; tip: string; options: Option[] }> = {
  tor: {
    commute: "Avg. commute: 33 min · TTC + bike + walk works well downtown",
    tip: "Get a Presto card on day 1. Student photo card slashes monthly pass.",
    options: [
      { mode: "metro", name: "TTC subway + streetcar",  pass: "CAD 128.15 / month (Adult)",        student: "CAD 128.15 (no student discount in adult range)", card: "Presto",       cover: "All TTC services" },
      { mode: "bike",  name: "Bike Share Toronto",       pass: "CAD 105 / year (annual)",            student: "Discounts via PATH membership",                    card: "Mobile app",   cover: "City-wide stations" },
      { mode: "rail",  name: "GO Transit (commuter)",    pass: "Pay-as-you-go (Presto)",             student: "20% off w/ PRESTO student card",                   card: "Presto",       cover: "GTHA region" },
      { mode: "rideshare", name: "Uber / Lyft",          pass: "Per-ride",                            student: "—",                                                 card: "App",          cover: "On-demand" },
    ],
  },
  lon: {
    commute: "Avg. commute: 46 min · Oyster + walking covers most needs",
    tip: "16+ Zip Oyster photocard saves 30% off pay-as-you-go (under 18) — adult students use 18+ Student Oyster for 30% off Travelcards.",
    options: [
      { mode: "metro", name: "Tube + Bus + Overground", pass: "£195 / month Zone 1-2",              student: "30% off w/ 18+ Student Oyster",                   card: "Oyster / contactless", cover: "All TfL services" },
      { mode: "bike",  name: "Santander Cycles",         pass: "£90 / year + £1.65 / 30min",         student: "—",                                                 card: "App",          cover: "Central London" },
      { mode: "rail",  name: "16-25 Railcard",           pass: "£30 / year",                          student: "33% off all UK rail tickets",                      card: "App / physical", cover: "National rail" },
      { mode: "rideshare", name: "Uber / Bolt",          pass: "Per-ride",                            student: "—",                                                 card: "App",          cover: "On-demand" },
    ],
  },
  ber: {
    commute: "Avg. commute: 38 min · Deutschlandticket is god-tier",
    tip: "€29/month Deutschlandticket Schüler covers ALL public transit nationwide for students. Best deal in Europe.",
    options: [
      { mode: "metro", name: "U-Bahn + S-Bahn + Bus + Tram", pass: "€29 / month (Deutschlandticket Schüler)", student: "€29 nationwide — unbeatable",                  card: "BVG app",      cover: "All Germany public transit" },
      { mode: "bike",  name: "Nextbike / Call a Bike",   pass: "€48 / year + €1 / 30min",            student: "Reduced w/ Deutsche Bahn Bahncard",                card: "Nextbike app", cover: "Berlin + 50+ cities" },
      { mode: "rail",  name: "Bahncard 25 / 50",         pass: "€59 / year (BC25 Jugend, < 27)",      student: "25–50% off Deutsche Bahn fares",                   card: "Physical/app", cover: "All DB long-distance" },
      { mode: "rideshare", name: "FreeNow / Uber",       pass: "Per-ride",                            student: "—",                                                 card: "App",          cover: "On-demand" },
    ],
  },
  nyc: {
    commute: "Avg. commute: 41 min · MetroCard / OMNY is king",
    tip: "30-day unlimited MetroCard pays off if you ride 23+ times. CUNY/NYU students often get subsidized passes.",
    options: [
      { mode: "metro", name: "MTA Subway + Bus",         pass: "$132 / 30-day unlimited",            student: "Student MetroCard via school (3 free rides/day)",  card: "OMNY tap",     cover: "All MTA" },
      { mode: "bike",  name: "Citi Bike",                pass: "$219 / year",                         student: "Reduced rate for income-qualified students",       card: "App",          cover: "5 boroughs + NJ" },
      { mode: "rail",  name: "LIRR / Metro-North",       pass: "Pay-as-you-go",                       student: "—",                                                 card: "MTA TrainTime app", cover: "Suburbs" },
      { mode: "rideshare", name: "Uber / Lyft / Revel",  pass: "Per-ride",                            student: "—",                                                 card: "App",          cover: "On-demand" },
    ],
  },
  syd: {
    commute: "Avg. commute: 36 min · Opal card + ferries are scenic",
    tip: "Concession Opal card halves fares — requires Australian student visa + proof of enrolment.",
    options: [
      { mode: "metro", name: "Train + Bus + Light Rail + Ferry", pass: "AUD ~50 / week (capped)", student: "Concession = 50% off",                          card: "Opal",         cover: "Greater Sydney" },
      { mode: "bike",  name: "Lime / Beam e-bikes",      pass: "Per-ride (AUD 1 unlock + 0.45/min)", student: "Lime student plan",                                card: "App",          cover: "City centre" },
      { mode: "rideshare", name: "Uber / DiDi",          pass: "Per-ride",                            student: "—",                                                 card: "App",          cover: "On-demand" },
    ],
  },
  ams: {
    commute: "Avg. commute: 28 min · Bike or get out",
    tip: "Don't buy a new bike — buy used (€80–120 at OV-fiets or Marktplaats). New bikes get stolen fast.",
    options: [
      { mode: "bike",  name: "Personal bike (USED)",     pass: "€80–€150 one-time",                  student: "Cheapest transit by far",                          card: "—",            cover: "City + surrounding villages" },
      { mode: "rail",  name: "NS Trains",                pass: "OV-Studentenkaart (free w/ DUO loan)", student: "Free off-peak + weekends if DUO eligible",        card: "OV-chipkaart", cover: "All NS" },
      { mode: "metro", name: "GVB Tram + Metro + Bus",   pass: "€100 / month",                        student: "—",                                                 card: "OV-chipkaart", cover: "Amsterdam" },
      { mode: "rideshare", name: "Uber",                 pass: "Per-ride",                            student: "—",                                                 card: "App",          cover: "On-demand" },
    ],
  },
};

const modeIcon = {
  metro:     <Train size={14} />,
  bus:       <Bus size={14} />,
  bike:      <Bike size={14} />,
  rideshare: <Car size={14} />,
  rail:      <Train size={14} />,
};

export default function TransitPage() {
  const [city, setCity] = useState<City>("tor");
  const d = data[city];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <Link href="/toolkit" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to Toolkit
      </Link>

      <header className="mb-8 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
          <Bus size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900">Transportation</h1>
          <p className="text-sm text-ink-600 mt-0.5">Public transit, student discounts, bikes, ride-share — by city.</p>
        </div>
      </header>

      {/* City tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.keys(cityMeta) as City[]).map((c) => (
          <button
            key={c}
            onClick={() => setCity(c)}
            className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${
              city === c ? "bg-clay-500 text-white" : "bg-cream-100 text-ink-700 hover:bg-cream-200"
            }`}
          >
            <span className={`fi fi-${cityMeta[c].flag}`} aria-hidden="true" />
            {cityMeta[c].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <p className="text-sm text-ink-700 flex items-center gap-2"><Clock size={14} className="text-clay-500" /> {d.commute}</p>
          <div className="mt-4 rounded-md bg-clay-500/10 border border-clay-500/25 px-4 py-3 flex items-start gap-3">
            <Tag size={16} className="text-clay-600 mt-0.5 shrink-0" />
            <p className="text-sm text-ink-700"><span className="font-medium text-clay-600">Pro tip:</span> {d.tip}</p>
          </div>
        </div>

        <div className="card">
          <h3 className="font-display text-base font-semibold text-ink-900 mb-2 flex items-center gap-2">
            <MapPin size={14} className="text-clay-500" /> Quick stats
          </h3>
          <p className="text-xs text-ink-500">All prices are local currency, monthly equivalents, student-eligible where shown.</p>
        </div>

        {/* Options grid */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          {d.options.map((o) => (
            <div key={o.name} className="card">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-9 h-9 rounded-md bg-clay-500/15 text-clay-600 flex items-center justify-center shrink-0">
                  {modeIcon[o.mode]}
                </div>
                <div>
                  <p className="font-medium text-ink-900">{o.name}</p>
                  <p className="text-xs text-ink-500 capitalize">{o.mode}</p>
                </div>
              </div>

              <dl className="text-sm space-y-1.5 mt-3">
                <Row label="Pass" value={o.pass} />
                <Row label="Student" value={o.student} highlight />
                <Row label="Card / app" value={o.card} icon={<CreditCard size={11} />} />
                <Row label="Covers" value={o.cover} />
              </dl>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-ink-500 mt-6">
        ⚠ Fares change frequently. Verify on each city&apos;s official transit website before relying on quoted amounts.
      </p>
    </div>
  );
}

function Row({ label, value, highlight, icon }: { label: string; value: string; highlight?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-xs text-ink-500 shrink-0 flex items-center gap-1">{icon} {label}</dt>
      <dd className={`text-right ${highlight ? "text-leaf-600 font-medium" : "text-ink-700"}`}>{value}</dd>
    </div>
  );
}
