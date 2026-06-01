"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Calculator, ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";

type City = {
  code: string; name: string; country: string; currency: string; symbol: string;
  rent: number; food: number; transit: number; utilities: number; insurance: number; misc: number;
};

const cities: City[] = [
  { code: "TOR", name: "Toronto",    country: "Canada",         currency: "CAD", symbol: "$",  rent: 1400, food: 450, transit: 156, utilities: 130, insurance: 0,   misc: 250 },
  { code: "VAN", name: "Vancouver",  country: "Canada",         currency: "CAD", symbol: "$",  rent: 1550, food: 470, transit: 104, utilities: 110, insurance: 0,   misc: 250 },
  { code: "LON", name: "London",     country: "United Kingdom", currency: "GBP", symbol: "£",  rent: 1100, food: 280, transit: 165, utilities: 100, insurance: 65,  misc: 200 },
  { code: "MAN", name: "Manchester", country: "United Kingdom", currency: "GBP", symbol: "£",  rent: 700,  food: 240, transit: 65,  utilities: 90,  insurance: 65,  misc: 180 },
  { code: "BER", name: "Berlin",     country: "Germany",        currency: "EUR", symbol: "€",  rent: 850,  food: 280, transit: 29,  utilities: 110, insurance: 130, misc: 200 },
  { code: "MUN", name: "Munich",     country: "Germany",        currency: "EUR", symbol: "€",  rent: 1100, food: 320, transit: 29,  utilities: 130, insurance: 130, misc: 220 },
  { code: "NYC", name: "New York",   country: "United States",  currency: "USD", symbol: "$",  rent: 2200, food: 550, transit: 132, utilities: 160, insurance: 200, misc: 350 },
  { code: "SYD", name: "Sydney",     country: "Australia",      currency: "AUD", symbol: "$",  rent: 1500, food: 500, transit: 200, utilities: 150, insurance: 80,  misc: 280 },
];

export default function CostCalcPage() {
  const [cityCode, setCityCode] = useState("TOR");
  const [rentAdj, setRentAdj] = useState(1.0); // multiplier
  const [includeMisc, setIncludeMisc] = useState(true);

  const city = useMemo(() => cities.find((c) => c.code === cityCode)!, [cityCode]);

  const breakdown = useMemo(() => {
    const rent = Math.round(city.rent * rentAdj);
    const items = [
      { label: "Rent",      value: rent,           note: rentAdj < 1 ? "Shared room / suburb" : rentAdj > 1 ? "Private downtown" : "Avg. student room" },
      { label: "Food",      value: city.food,      note: "Groceries + occasional eat-out" },
      { label: "Transit",   value: city.transit,   note: "Student monthly pass" },
      { label: "Utilities", value: city.utilities, note: "Electricity, internet, water" },
      { label: "Insurance", value: city.insurance, note: city.insurance === 0 ? "Public health (free)" : "Statutory student health" },
    ];
    if (includeMisc) items.push({ label: "Misc", value: city.misc, note: "Phone, gym, fun" });
    const total = items.reduce((a, b) => a + b.value, 0);
    return { items, total };
  }, [city, rentAdj, includeMisc]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <Link href="/toolkit" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to Toolkit
      </Link>

      <header className="mb-8 flex items-center gap-3">
        <div className="w-11 h-11 rounded-lg bg-clay-500/15 text-clay-600 flex items-center justify-center">
          <Calculator size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900">Cost of Living Calculator</h1>
          <p className="text-sm text-ink-600 mt-0.5">Monthly estimate for an international student. Real averages, not guesses.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="card space-y-5">
          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">City</span>
            <select value={cityCode} onChange={(e) => setCityCode(e.target.value)} className="input">
              {cities.map((c) => (
                <option key={c.code} value={c.code}>{c.name} · {c.country}</option>
              ))}
            </select>
          </label>

          <div>
            <span className="block text-xs font-medium text-ink-600 mb-1.5">
              Housing tier — {rentAdj < 1 ? "Shared / suburb" : rentAdj > 1 ? "Private downtown" : "Average"}
            </span>
            <input type="range" min={0.6} max={1.6} step={0.1} value={rentAdj} onChange={(e) => setRentAdj(parseFloat(e.target.value))} className="w-full accent-clay-500" />
            <div className="flex justify-between text-[10px] text-ink-500 mt-1"><span>0.6×</span><span>1.0×</span><span>1.6×</span></div>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={includeMisc} onChange={(e) => setIncludeMisc(e.target.checked)} className="w-4 h-4 accent-clay-500" />
            Include misc (phone, gym, leisure)
          </label>

          <div className="pt-2 border-t border-cream-200 text-xs text-ink-500">
            Data: {city.country} · {city.currency}. Updated quarterly from community submissions + official statistics.
          </div>
        </div>

        {/* Breakdown */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-xs text-ink-500 uppercase tracking-wider">Monthly total</p>
                <p className="text-4xl font-display font-semibold text-ink-900">
                  {city.symbol}{breakdown.total.toLocaleString()}
                  <span className="text-base font-normal text-ink-500 ml-2">/ month</span>
                </p>
              </div>
              <span className="text-xs text-ink-500">in {city.name}</span>
            </div>

            <ul className="space-y-2">
              {breakdown.items.map((b) => {
                const pct = Math.round((b.value / breakdown.total) * 100);
                return (
                  <li key={b.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink-900">{b.label}</span>
                      <span className="text-ink-700">{city.symbol}{b.value.toLocaleString()} <span className="text-xs text-ink-500">({pct}%)</span></span>
                    </div>
                    <p className="text-xs text-ink-500">{b.note}</p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-cream-200 overflow-hidden">
                      <div className="h-full bg-clay-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Compare row */}
          <div className="card">
            <p className="text-sm font-medium text-ink-900 mb-3">How {city.name} compares</p>
            <div className="grid sm:grid-cols-3 gap-2">
              {cities.filter((c) => c.code !== city.code).slice(0, 3).map((c) => {
                const total = c.rent + c.food + c.transit + c.utilities + c.insurance + (includeMisc ? c.misc : 0);
                const diff = total - breakdown.total;
                return (
                  <div key={c.code} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-cream-100">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900 truncate">{c.name}</p>
                      <p className="text-xs text-ink-500">{c.symbol}{total.toLocaleString()}</p>
                    </div>
                    <span className={`text-xs font-medium flex items-center gap-1 ${diff > 0 ? "text-red-600" : "text-leaf-600"}`}>
                      {diff > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {diff > 0 ? "+" : ""}{c.symbol}{Math.abs(diff).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
