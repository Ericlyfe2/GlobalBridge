"use client";

import Link from "next/link";
import { useState } from "react";
import { Smartphone, ArrowLeft, Wifi, CreditCard, AlertTriangle, CheckCircle2 } from "lucide-react";

type Country = "ca" | "uk" | "de" | "us" | "au";

const labels: Record<Country, string> = { ca: "Canada", uk: "United Kingdom", de: "Germany", us: "United States", au: "Australia" };
const flags: Record<Country, string> = { ca: "ca", uk: "gb", de: "de", us: "us", au: "au" };

type Plan = {
  carrier: string; type: "prepaid" | "postpaid" | "esim";
  data: string; price: string;
  callsTexts: string;
  needs: string[];
  notes: string;
};

const plans: Record<Country, Plan[]> = {
  ca: [
    { carrier: "Public Mobile",     type: "prepaid",  data: "20 GB / mo",   price: "CAD 25 / mo",         callsTexts: "Unlimited CA",   needs: ["No SIN required", "Online activation"],                  notes: "Best prepaid for students. Reward points for tenure." },
    { carrier: "Fizz",              type: "prepaid",  data: "30 GB / mo",   price: "CAD 35 / mo",         callsTexts: "Unlimited",      needs: ["Quebec/Ontario only", "Credit card or PayPal"],          notes: "Roll over unused data. Owned by Vidéotron." },
    { carrier: "Freedom Mobile",    type: "postpaid", data: "50 GB / mo",   price: "CAD 39 / mo",         callsTexts: "Unlimited",      needs: ["ID + Canadian credit history"],                          notes: "Cheaper than Big 3 (Bell/Rogers/Telus) but smaller coverage." },
  ],
  uk: [
    { carrier: "Smarty",            type: "prepaid",  data: "50 GB / mo",   price: "£10 / mo",           callsTexts: "Unlimited UK",   needs: ["Just UK address"],                                       notes: "Three network. Best value for students." },
    { carrier: "Lebara",            type: "prepaid",  data: "30 GB / mo",   price: "£10 / mo",           callsTexts: "Unlimited + 100 int'l mins", needs: ["Just an address"],                  notes: "Cheap international calls — popular with international students." },
    { carrier: "Giffgaff",          type: "prepaid",  data: "40 GB / mo",   price: "£15 / mo",           callsTexts: "Unlimited UK",   needs: ["UK address"],                                            notes: "O2 network. Strong community support, no contract." },
  ],
  de: [
    { carrier: "Aldi Talk",         type: "prepaid",  data: "20 GB / 4w",   price: "€12.99 / 4 weeks",   callsTexts: "Unlimited DE",   needs: ["Passport for identity verification"],                    notes: "Best prepaid in DE. Activate in Aldi store or online." },
    { carrier: "Vodafone CallYa",   type: "prepaid",  data: "20 GB / mo",   price: "€20 / mo",           callsTexts: "Unlimited DE + EU", needs: ["Passport for activation"],                            notes: "Vodafone network coverage." },
    { carrier: "Lidl Connect",      type: "prepaid",  data: "12 GB / 4w",   price: "€7.99 / 4 weeks",    callsTexts: "Unlimited DE",   needs: ["Passport"],                                              notes: "Cheap entry. Telefónica (O2) network." },
  ],
  us: [
    { carrier: "Mint Mobile",       type: "prepaid",  data: "15 GB / mo",   price: "$15 / mo (12-mo plan)", callsTexts: "Unlimited US", needs: ["US shipping address (no SSN)"],                  notes: "Cheapest reliable. T-Mobile network. Annual prepay." },
    { carrier: "US Mobile",         type: "esim",     data: "30 GB / mo",   price: "$25 / mo",          callsTexts: "Unlimited",       needs: ["No SSN required", "eSIM compatible phone"],              notes: "Switch carriers (Verizon/T-Mobile) in-app." },
    { carrier: "T-Mobile Connect",  type: "postpaid", data: "8 GB / mo",    price: "$30 / mo",          callsTexts: "Unlimited",       needs: ["SSN or ITIN for postpaid"],                              notes: "Postpaid entry — for credit-building." },
  ],
  au: [
    { carrier: "Amaysim",           type: "prepaid",  data: "40 GB / mo",   price: "AUD 25 / mo",        callsTexts: "Unlimited AU",   needs: ["AU address"],                                            notes: "Optus network. Roll over unused data." },
    { carrier: "Boost Mobile",      type: "prepaid",  data: "55 GB / 28d",  price: "AUD 35 / 28 days",   callsTexts: "Unlimited AU + 35 int'l countries", needs: ["AU address"],                notes: "Full Telstra network coverage — only MVNO with this." },
    { carrier: "Belong",            type: "prepaid",  data: "40 GB / mo",   price: "AUD 25 / mo",        callsTexts: "Unlimited AU",   needs: ["AU address"],                                            notes: "Telstra-owned. Reliable for rural areas." },
  ],
};

export default function SimPage() {
  const [country, setCountry] = useState<Country>("ca");

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <Link href="/toolkit" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to Toolkit
      </Link>

      <header className="mb-8 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-sky-500/15 text-sky-600 flex items-center justify-center shrink-0">
          <Smartphone size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900">SIM &amp; Mobile</h1>
          <p className="text-sm text-ink-600 mt-0.5">Affordable plans without locking you into a 24-month contract.</p>
        </div>
      </header>

      {/* Country tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.keys(labels) as Country[]).map((c) => (
          <button
            key={c}
            onClick={() => setCountry(c)}
            className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${
              country === c ? "bg-clay-500 text-white" : "bg-cream-100 text-ink-700 hover:bg-cream-200"
            }`}
          >
            <span className={`fi fi-${flags[c]}`} aria-hidden="true" />
            {labels[c]}
          </button>
        ))}
      </div>

      {/* Quick tips */}
      <div className="card mb-6">
        <h2 className="font-display text-base font-semibold text-ink-900 mb-3">Day-1 strategy</h2>
        <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-ink-700">
          {[
            "Buy an eSIM at the airport so you can call an Uber + activate banking",
            "Activate a cheap prepaid for 1-2 months while you settle",
            "Switch to a longer plan once you have local address proof",
            "Keep your home-country eSIM active for OTPs (Twilio / banks)",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2"><CheckCircle2 size={14} className="text-leaf-600 mt-0.5 shrink-0" /> {t}</li>
          ))}
        </ol>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans[country].map((p) => (
          <div key={p.carrier} className="card">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium text-ink-900">{p.carrier}</h3>
                <p className="text-xs text-ink-500 mt-0.5 capitalize">{p.type}</p>
              </div>
              <span className="badge badge-clay text-[10px]">{p.data}</span>
            </div>

            <p className="text-2xl font-display font-semibold text-ink-900">{p.price}</p>
            <p className="text-xs text-ink-500 mt-1">{p.callsTexts}</p>

            <div className="mt-4 pt-4 border-t border-cream-200 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">What you need</p>
              <ul className="space-y-1 text-xs text-ink-700">
                {p.needs.map((n) => (
                  <li key={n} className="flex items-start gap-1.5"><CheckCircle2 size={11} className="text-leaf-600 mt-0.5 shrink-0" />{n}</li>
                ))}
              </ul>
              <p className="text-xs text-ink-600 italic mt-3 pt-3 border-t border-cream-200">{p.notes}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Watch out */}
      <div className="card mt-6 border-amber-300 dark:border-amber-900/40">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold text-amber-500 mb-3">
          <AlertTriangle size={14} /> Watch out for
        </h3>
        <ul className="space-y-2 text-sm text-ink-700">
          <li className="flex items-start gap-2"><CreditCard size={14} className="text-amber-500 mt-0.5 shrink-0" /> 24-month postpaid contracts from carrier stores — usually a bad deal vs prepaid MVNOs</li>
          <li className="flex items-start gap-2"><Wifi size={14} className="text-amber-500 mt-0.5 shrink-0" /> "Unlimited" data with deprioritized speeds after 20-50 GB — read the fine print</li>
          <li className="flex items-start gap-2"><Smartphone size={14} className="text-amber-500 mt-0.5 shrink-0" /> Buying a phone "free" on contract means you usually pay 2-3× the device price spread over the contract</li>
        </ul>
      </div>
    </div>
  );
}
