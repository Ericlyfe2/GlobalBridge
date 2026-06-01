"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Tag, ArrowLeft, Search, ExternalLink, Code, Plane, ShoppingBag, Utensils, Film, Music } from "lucide-react";

type Category = "all" | "software" | "travel" | "food" | "entertainment" | "shopping" | "music";

type Discount = {
  brand: string; offer: string; category: Exclude<Category, "all">;
  verify: "ISIC" | "Edu Email" | "Student Beans" | "UNiDAYS" | "Just student ID";
  url: string;
  global: boolean;
};

const items: Discount[] = [
  { brand: "GitHub Student Pack", offer: "Free private repos + 100+ tools (Notion, JetBrains, DigitalOcean credits)", category: "software", verify: "Edu Email", url: "https://education.github.com/pack", global: true },
  { brand: "Notion",              offer: "Free Plus plan ($96/yr value)", category: "software", verify: "Edu Email", url: "#", global: true },
  { brand: "Figma",               offer: "Free Professional plan",         category: "software", verify: "Edu Email", url: "#", global: true },
  { brand: "Apple Music",         offer: "$5.99/month (vs $10.99) + free Apple TV+", category: "music", verify: "UNiDAYS", url: "#", global: true },
  { brand: "Spotify Premium Student", offer: "$5.99/month + Hulu + SHOWTIME", category: "music", verify: "Just student ID", url: "#", global: false },
  { brand: "Amazon Prime Student", offer: "6 months free, then 50% off",     category: "shopping", verify: "Edu Email", url: "#", global: false },
  { brand: "ASOS",                offer: "10% off w/ Student Beans",          category: "shopping", verify: "Student Beans", url: "#", global: true },
  { brand: "Adobe Creative Cloud", offer: "65% off ($19.99/mo for all apps)", category: "software", verify: "Edu Email", url: "#", global: true },
  { brand: "STA Travel / ISIC Flights", offer: "Student airfares — sometimes 20% off long-haul", category: "travel", verify: "ISIC", url: "https://isic.org", global: true },
  { brand: "Eurail Youth Pass",   offer: "Up to 25% off vs adult pass (under 28)", category: "travel", verify: "Just student ID", url: "#", global: false },
  { brand: "Hostelworld",         offer: "10% off bookings w/ ISIC",         category: "travel", verify: "ISIC", url: "#", global: true },
  { brand: "Uber Eats",           offer: "Free Uber One for 4 months",       category: "food", verify: "Edu Email", url: "#", global: false },
  { brand: "DoorDash DashPass",   offer: "$4.99/month (vs $9.99)",           category: "food", verify: "Edu Email", url: "#", global: false },
  { brand: "Cineworld / AMC",     offer: "£5–8 student tickets",              category: "entertainment", verify: "Just student ID", url: "#", global: false },
  { brand: "Disney+",             offer: "Bundle w/ Hulu via Spotify",        category: "entertainment", verify: "Just student ID", url: "#", global: false },
  { brand: "YouTube Premium",     offer: "$7.99/month (vs $13.99)",          category: "music", verify: "Edu Email", url: "#", global: true },
  { brand: "Microsoft 365",       offer: "Free for students w/ school email", category: "software", verify: "Edu Email", url: "#", global: true },
  { brand: "JetBrains IDEs",      offer: "Free WebStorm/IntelliJ/PyCharm",   category: "software", verify: "Edu Email", url: "https://jetbrains.com/student", global: true },
];

const cats: { key: Category; label: string; icon: React.ReactNode }[] = [
  { key: "all",            label: "All",          icon: <Tag size={13} /> },
  { key: "software",       label: "Software",     icon: <Code size={13} /> },
  { key: "travel",         label: "Travel",       icon: <Plane size={13} /> },
  { key: "shopping",       label: "Shopping",     icon: <ShoppingBag size={13} /> },
  { key: "food",           label: "Food",         icon: <Utensils size={13} /> },
  { key: "entertainment",  label: "Entertainment", icon: <Film size={13} /> },
  { key: "music",          label: "Music",        icon: <Music size={13} /> },
];

const verifyColor = {
  "ISIC":             "!bg-clay-500/15 !text-clay-600",
  "Edu Email":        "!bg-leaf-500/15 !text-leaf-600",
  "Student Beans":    "!bg-amber-500/15 !text-amber-500",
  "UNiDAYS":          "!bg-sky-500/15 !text-sky-600",
  "Just student ID":  "!bg-cream-200 !text-ink-700",
};

export default function DiscountsPage() {
  const [cat, setCat] = useState<Category>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (cat !== "all" && i.category !== cat) return false;
      if (q && !`${i.brand} ${i.offer}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [cat, q]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <Link href="/toolkit" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to Toolkit
      </Link>

      <header className="mb-6 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-leaf-500/15 text-leaf-600 flex items-center justify-center shrink-0">
          <Tag size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900">Student Discounts</h1>
          <p className="text-sm text-ink-600 mt-0.5">{items.length} verified deals on software, travel, food, entertainment, and more.</p>
        </div>
      </header>

      {/* Search + categories */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9 text-sm" placeholder="Search brand or offer" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {cats.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
              cat === c.key ? "bg-clay-500 text-white" : "bg-cream-100 text-ink-700 hover:bg-cream-200"
            }`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((i) => (
          <a key={i.brand} href={i.url} target="_blank" rel="noreferrer" className="card hover:border-clay-300 transition flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-medium text-ink-900">{i.brand}</h3>
              <ExternalLink size={14} className="text-ink-400 shrink-0" />
            </div>
            <p className="text-sm text-ink-700 leading-snug">{i.offer}</p>

            <div className="mt-auto pt-3 flex items-center justify-between gap-2 flex-wrap">
              <span className={`badge ${verifyColor[i.verify]} text-[10px]`}>{i.verify}</span>
              {i.global && <span className="text-[10px] text-ink-500">🌍 Global</span>}
            </div>
          </a>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full card text-center text-sm text-ink-500 py-10">
            <Tag size={20} className="mx-auto mb-2 opacity-50" /> No discounts match.
          </div>
        )}
      </div>

      <div className="card mt-6">
        <h3 className="font-display text-base font-semibold text-ink-900 mb-2">Get verified once, save everywhere</h3>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-ink-700">
          <li><span className="badge !bg-clay-500/15 !text-clay-600 mr-2">ISIC</span> International Student Identity Card — $20/yr, valid in 130+ countries</li>
          <li><span className="badge !bg-leaf-500/15 !text-leaf-600 mr-2">Edu Email</span> Use your .edu / .ac.uk / .de email — free, instant</li>
          <li><span className="badge !bg-amber-500/15 !text-amber-500 mr-2">Student Beans</span> UK-focused, partners w/ 200+ brands</li>
          <li><span className="badge !bg-sky-500/15 !text-sky-600 mr-2">UNiDAYS</span> Global, partners w/ Apple, ASOS, etc.</li>
        </ul>
      </div>
    </div>
  );
}
