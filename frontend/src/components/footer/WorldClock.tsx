"use client";
import { useState, useEffect } from "react";
import { useTranslation } from "@/i18n/hooks/useTranslation";

const CITIES = [
  { labelKey: "landing.footer.cities.toronto", tz: "America/Toronto" },
  { labelKey: "landing.footer.cities.london", tz: "Europe/London" },
  { labelKey: "landing.footer.cities.berlin", tz: "Europe/Berlin" },
  { labelKey: "landing.footer.cities.sydney", tz: "Australia/Sydney" },
  { labelKey: "landing.footer.cities.dublin", tz: "Europe/Dublin" },
];

export default function WorldClock() {
  const { t } = useTranslation();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => {
      if (!document.hidden) setNow(new Date());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  return (
    <div className="flex flex-col gap-2">
      {CITIES.map((c) => {
        const timeStr = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: c.tz }).format(now);
        return (
          <div key={c.labelKey} className="flex items-center justify-between gap-6 text-sm">
            <span className="font-mono tracking-widest uppercase text-ink-500 text-xs">{t(c.labelKey)}</span>
            <span className="font-mono text-ink-800">{timeStr}</span>
          </div>
        );
      })}
    </div>
  );
}
