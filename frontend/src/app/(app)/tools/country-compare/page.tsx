"use client";

import { useState, useMemo } from "react";
import {
  Globe, Bot, Loader2, ArrowRightLeft, DollarSign, FileText, Briefcase,
  Home, GraduationCap, Heart, Shield, Banknote,
} from "lucide-react";
import { FlagSelect, type FlagOption } from "@/components/FlagSelect";
import { useTranslation } from "@/i18n/hooks/useTranslation";

type ComparisonCategory = {
  label: string;
  country1: string;
  country2: string;
  icon: string;
};

type ComparisonResult = {
  categories: ComparisonCategory[];
  summary: string;
  verdict: string;
  country1Name: string;
  country2Name: string;
  country1Code: string;
  country2Code: string;
};

const ICON_MAP: Record<string, typeof DollarSign> = {
  dollar: DollarSign,
  passport: FileText,
  briefcase: Briefcase,
  home: Home,
  graduation: GraduationCap,
  heart: Heart,
  shield: Shield,
  bank: Banknote,
};

const COUNTRIES: FlagOption[] = [
  { value: "ca", label: "Canada", flag: "ca" },
  { value: "us", label: "United States", flag: "us" },
  { value: "gb", label: "United Kingdom", flag: "gb" },
  { value: "de", label: "Germany", flag: "de" },
  { value: "fr", label: "France", flag: "fr" },
  { value: "au", label: "Australia", flag: "au" },
  { value: "nz", label: "New Zealand", flag: "nz" },
  { value: "ie", label: "Ireland", flag: "ie" },
  { value: "nl", label: "Netherlands", flag: "nl" },
  { value: "se", label: "Sweden", flag: "se" },
  { value: "no", label: "Norway", flag: "no" },
  { value: "dk", label: "Denmark", flag: "dk" },
  { value: "fi", label: "Finland", flag: "fi" },
  { value: "ch", label: "Switzerland", flag: "ch" },
  { value: "at", label: "Austria", flag: "at" },
  { value: "be", label: "Belgium", flag: "be" },
  { value: "it", label: "Italy", flag: "it" },
  { value: "es", label: "Spain", flag: "es" },
  { value: "pt", label: "Portugal", flag: "pt" },
  { value: "jp", label: "Japan", flag: "jp" },
  { value: "kr", label: "South Korea", flag: "kr" },
  { value: "sg", label: "Singapore", flag: "sg" },
  { value: "ae", label: "UAE", flag: "ae" },
  { value: "my", label: "Malaysia", flag: "my" },
  { value: "cn", label: "China", flag: "cn" },
  { value: "in", label: "India", flag: "in" },
  { value: "br", label: "Brazil", flag: "br" },
  { value: "za", label: "South Africa", flag: "za" },
  { value: "gh", label: "Ghana", flag: "gh" },
  { value: "ng", label: "Nigeria", flag: "ng" },
  { value: "ke", label: "Kenya", flag: "ke" },
  { value: "eg", label: "Egypt", flag: "eg" },
  { value: "tr", label: "Turkey", flag: "tr" },
  { value: "ru", label: "Russia", flag: "ru" },
];

export default function CountryComparePage() {
  const { t } = useTranslation();
  const [country1, setCountry1] = useState("gh");
  const [country2, setCountry2] = useState("ca");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  async function runCompare() {
    if (country1 === country2) {
      setError(t("tools.countryCompare.sameCountry"));
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/ai/compare-countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country1, country2 }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        setError(data?.error || `Request failed (${res.status})`);
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  function swap() {
    setCountry1(country2);
    setCountry2(country1);
  }

  const c1Name = COUNTRIES.find((c) => c.value === country1)?.label ?? country1.toUpperCase();
  const c2Name = COUNTRIES.find((c) => c.value === country2)?.label ?? country2.toUpperCase();

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="card text-center py-20">
          <Loader2 size={36} className="mx-auto mb-4 text-clay-500 animate-spin" />
          <p className="text-ink-700 font-medium">{t("tools.countryCompare.analyzing")}</p>
          <p className="text-xs text-ink-500 mt-2">{t("tools.countryCompare.analyzingDesc")}</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="card text-center py-12">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
            <Globe size={22} />
          </div>
          <p className="text-sm text-ink-700">{error}</p>
          <button onClick={runCompare} className="btn-accent text-sm mt-4">
            {t("common.tryAgain")}
          </button>
        </div>
      );
    }

    if (!result || result.categories.length === 0) {
      return (
        <div className="card text-center py-20">
          <ArrowRightLeft size={32} className="mx-auto mb-3 text-ink-500 opacity-50" />
          <p className="text-sm text-ink-600">{t("tools.countryCompare.selectPrompt")}</p>
          <p className="text-xs text-ink-500 mt-2">{t("tools.countryCompare.selectPromptDesc")}</p>
        </div>
      );
    }

    return (
      <>
        {/* Summary */}
        <div className="card border-clay-300 mb-6">
          <p className="text-sm text-ink-700 leading-relaxed">{result.summary}</p>
          {result.verdict && (
            <div className="mt-4 pt-4 border-t border-cream-200 flex items-start gap-2">
              <Bot size={16} className="text-clay-600 mt-0.5 shrink-0" />
              <p className="text-sm font-medium text-clay-600">{result.verdict}</p>
            </div>
          )}
        </div>

        {/* Comparison Grid */}
        <div className="space-y-3">
          {result.categories.map((cat, i) => {
            const Icon = ICON_MAP[cat.icon] ?? Globe;
            return (
              <div key={i} className="card">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cream-200">
                  <Icon size={16} className="text-clay-600 shrink-0" />
                  <h3 className="font-display text-sm font-semibold text-ink-900">{cat.label}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <span className={`fi fi-${result.country1Code} mt-0.5 shrink-0`} aria-hidden="true" />
                    <div>
                      <p className="text-xs font-medium text-ink-500 mb-0.5">{result.country1Name}</p>
                      <p className="text-sm text-ink-700">{cat.country1}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className={`fi fi-${result.country2Code} mt-0.5 shrink-0`} aria-hidden="true" />
                    <div>
                      <p className="text-xs font-medium text-ink-500 mb-0.5">{result.country2Name}</p>
                      <p className="text-sm text-ink-700">{cat.country2}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }, [loading, error, result, t, runCompare, c1Name, c2Name, country1, country2]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <header className="mb-6 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-clay-500/15 text-clay-600 flex items-center justify-center shrink-0">
          <ArrowRightLeft size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900 flex items-center gap-2">
            {t("tools.countryCompare.title")}
            <span className="badge badge-clay text-[10px]"><Bot size={10} /> AI</span>
          </h1>
          <p className="text-sm text-ink-600 mt-1">{t("tools.countryCompare.subtitle")}</p>
        </div>
      </header>

      {/* Country selectors */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1.5">{t("tools.countryCompare.country1")}</label>
            <FlagSelect value={country1} onChange={setCountry1} options={COUNTRIES} />
          </div>

          <button
            onClick={swap}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-cream-200 hover:bg-cream-300 transition self-center mt-5"
            aria-label={t("tools.countryCompare.swap")}
          >
            <ArrowRightLeft size={16} className="text-ink-700" />
          </button>

          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1.5">{t("tools.countryCompare.country2")}</label>
            <FlagSelect value={country2} onChange={setCountry2} options={COUNTRIES} />
          </div>
        </div>

        <button
          onClick={runCompare}
          disabled={loading || country1 === country2}
          className="btn-accent w-full mt-4 disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 size={14} className="animate-spin" /> {t("tools.countryCompare.comparing")}</>
          ) : (
            <><Globe size={14} /> {t("tools.countryCompare.compare")}</>
          )}
        </button>
      </div>

      {content}

      <p className="text-xs text-ink-500 mt-6">
        {t("tools.countryCompare.disclaimer")}
      </p>
    </div>
  );
}
