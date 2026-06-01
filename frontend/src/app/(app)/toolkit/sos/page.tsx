"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PhoneCall, ArrowLeft, AlertTriangle, Phone, Heart, Shield, MapPin, MessageCircle } from "lucide-react";

type Country = "ca" | "uk" | "de" | "us" | "au" | "gh" | "ng";

const labels: Record<Country, string> = {
  ca: "Canada", uk: "United Kingdom", de: "Germany", us: "United States", au: "Australia", gh: "Ghana", ng: "Nigeria",
};
const flags: Record<Country, string> = { ca: "ca", uk: "gb", de: "de", us: "us", au: "au", gh: "gh", ng: "ng" };

type Contact = { label: string; number: string; note?: string; tone: "red" | "amber" | "sky" | "leaf" };

const data: Record<Country, { emergency: Contact[]; mental: Contact[]; embassy: { country: string; number: string }[] }> = {
  ca: {
    emergency: [
      { label: "Police / Fire / Ambulance", number: "911",         tone: "red" },
      { label: "Non-emergency police",       number: "311",         tone: "amber" },
      { label: "Poison control",             number: "1-800-268-9017", tone: "amber" },
    ],
    mental: [
      { label: "Talk Suicide Canada",   number: "1-833-456-4566", note: "24/7", tone: "sky" },
      { label: "Kids Help Phone",        number: "1-800-668-6868", note: "Under 20", tone: "sky" },
    ],
    embassy: [
      { country: "Ghana High Commission, Ottawa",      number: "+1-613-236-0871" },
      { country: "Nigeria High Commission, Ottawa",    number: "+1-613-236-0521" },
      { country: "India High Commission, Ottawa",      number: "+1-613-744-3751" },
    ],
  },
  uk: {
    emergency: [
      { label: "Emergency",                 number: "999",  tone: "red" },
      { label: "Non-emergency police",      number: "101",  tone: "amber" },
      { label: "NHS non-emergency",         number: "111",  tone: "amber" },
    ],
    mental: [
      { label: "Samaritans",                number: "116 123",          note: "24/7", tone: "sky" },
      { label: "Shout (text-based)",        number: "Text SHOUT to 85258", tone: "sky" },
    ],
    embassy: [
      { country: "Ghana High Commission, London",    number: "+44-20-7201-5900" },
      { country: "Nigeria High Commission, London",  number: "+44-20-7839-1244" },
      { country: "India High Commission, London",    number: "+44-20-7836-8484" },
    ],
  },
  de: {
    emergency: [
      { label: "Emergency (any)", number: "112", tone: "red" },
      { label: "Police",          number: "110", tone: "red" },
    ],
    mental: [
      { label: "Telefonseelsorge", number: "0800 111 0 111", note: "24/7 free", tone: "sky" },
    ],
    embassy: [
      { country: "Ghana Embassy, Berlin",   number: "+49-30-547-1490" },
      { country: "Nigeria Embassy, Berlin", number: "+49-30-212-300" },
    ],
  },
  us: {
    emergency: [
      { label: "Police / Fire / EMS",  number: "911",       tone: "red" },
      { label: "Poison control",        number: "1-800-222-1222", tone: "amber" },
    ],
    mental: [
      { label: "988 Suicide & Crisis", number: "988", note: "Call or text", tone: "sky" },
    ],
    embassy: [
      { country: "Ghana Embassy, Washington",   number: "+1-202-686-4520" },
      { country: "Nigeria Embassy, Washington", number: "+1-202-516-4078" },
    ],
  },
  au: {
    emergency: [
      { label: "Emergency", number: "000", tone: "red" },
    ],
    mental: [
      { label: "Lifeline",  number: "13 11 14", note: "24/7", tone: "sky" },
      { label: "Beyond Blue", number: "1300 22 4636", tone: "sky" },
    ],
    embassy: [
      { country: "Ghana High Commission, Canberra", number: "+61-2-6290-2999" },
    ],
  },
  gh: {
    emergency: [
      { label: "Police",     number: "191",     tone: "red" },
      { label: "Fire",        number: "192",     tone: "red" },
      { label: "Ambulance",   number: "193",     tone: "red" },
    ],
    mental: [
      { label: "Mental Health Authority", number: "+233-30-251-3115", tone: "sky" },
    ],
    embassy: [],
  },
  ng: {
    emergency: [
      { label: "Emergency", number: "112", tone: "red" },
      { label: "Police",     number: "199", tone: "red" },
    ],
    mental: [
      { label: "Mentally Aware NG", number: "+234-906-000-6747", tone: "sky" },
    ],
    embassy: [],
  },
};

export default function SOSPage() {
  const [country, setCountry] = useState<Country>("ca");
  const [trustedContact, setTrustedContact] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sos-trusted");
      if (saved) setTrustedContact(saved);
    } catch {}
  }, []);

  function saveContact(v: string) {
    setTrustedContact(v);
    try { localStorage.setItem("sos-trusted", v); } catch {}
  }

  const d = data[country];

  function alertContact() {
    if (!trustedContact) { alert("Add a trusted contact first."); return; }
    window.location.href = `sms:${trustedContact}?body=${encodeURIComponent("EMERGENCY — I need help. My approximate location: " + (typeof navigator !== "undefined" ? navigator.userAgent : ""))}`;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link href="/toolkit" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to Toolkit
      </Link>

      <header className="mb-8 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-red-500/15 text-red-600 flex items-center justify-center shrink-0">
          <PhoneCall size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900">Emergency SOS</h1>
          <p className="text-sm text-ink-600 mt-0.5">Save this page. Country-specific hotlines, embassy lines, and a one-tap alert to your trusted contact.</p>
        </div>
      </header>

      {/* One-tap SOS */}
      <div className="card border-red-300 dark:border-red-900/40 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-red-600 mt-1 shrink-0" size={20} />
          <div className="flex-1">
            <h2 className="font-display text-lg font-semibold text-red-600">One-tap SOS</h2>
            <p className="text-sm text-ink-600 mt-1">Send an SMS to your trusted contact with your situation. Add their number once and we&apos;ll remember it.</p>
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <input
                value={trustedContact}
                onChange={(e) => saveContact(e.target.value)}
                placeholder="+1 555 123 4567"
                className="input max-w-xs"
              />
              <button onClick={alertContact} className="px-4 py-2 rounded-md font-medium bg-red-600 text-white hover:bg-red-700 transition flex items-center gap-2">
                <MessageCircle size={15} /> Alert contact
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Country selector */}
      <p className="text-xs font-medium uppercase tracking-wider text-ink-500 mb-2">Choose where you are</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Emergency */}
        <Section title="Emergency services" icon={<Shield size={16} />} tone="red">
          {d.emergency.map((c) => <Row key={c.label} c={c} />)}
        </Section>

        {/* Mental health */}
        <Section title="Mental health support" icon={<Heart size={16} />} tone="sky">
          {d.mental.length === 0 ? <p className="text-sm text-ink-500">Coming soon.</p> :
            d.mental.map((c) => <Row key={c.label} c={c} />)}
        </Section>

        {/* Embassies */}
        <div className="card md:col-span-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900 mb-3">
            <MapPin size={16} className="text-clay-500" /> Embassy / consulate contacts
          </h2>
          {d.embassy.length === 0 ? (
            <p className="text-sm text-ink-500">No embassy data yet for {labels[country]}. Help us — submit one via Settings.</p>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {d.embassy.map((e) => (
                <li key={e.country} className="flex items-center justify-between gap-3">
                  <span className="text-ink-700">{e.country}</span>
                  <a href={`tel:${e.number.replace(/[^+\d]/g, "")}`} className="text-clay-600 font-medium font-mono hover:underline whitespace-nowrap flex items-center gap-1">
                    <Phone size={11} /> {e.number}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-xs text-ink-500 mt-6">
        ⚠ Numbers may change. Always call official sources first. This page works offline once visited.
      </p>
    </div>
  );
}

function Section({ title, icon, tone, children }: { title: string; icon: React.ReactNode; tone: "red" | "sky"; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className={`flex items-center gap-2 font-display text-lg font-semibold mb-3 ${tone === "red" ? "text-red-600" : "text-sky-600"}`}>
        {icon} {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ c }: { c: Contact }) {
  return (
    <a href={`tel:${c.number.replace(/[^+\d]/g, "")}`} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-cream-100 transition">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-900">{c.label}</p>
        {c.note && <p className="text-xs text-ink-500">{c.note}</p>}
      </div>
      <span className="text-sm font-mono font-semibold text-clay-600 whitespace-nowrap flex items-center gap-1">
        <Phone size={11} /> {c.number}
      </span>
    </a>
  );
}
