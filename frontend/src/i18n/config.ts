export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", native: "English", flag: "us", rtl: false },
  { code: "fr", label: "French", native: "Français", flag: "fr", rtl: false },
  { code: "es", label: "Spanish", native: "Español", flag: "es", rtl: false },
  { code: "de", label: "German", native: "Deutsch", flag: "de", rtl: false },
  { code: "it", label: "Italian", native: "Italiano", flag: "it", rtl: false },
  { code: "pt", label: "Portuguese", native: "Português", flag: "br", rtl: false },
  { code: "ar", label: "Arabic", native: "العربية", flag: "sa", rtl: true },
  { code: "zh", label: "Chinese", native: "中文", flag: "cn", rtl: false },
  { code: "ja", label: "Japanese", native: "日本語", flag: "jp", rtl: false },
  { code: "ko", label: "Korean", native: "한국어", flag: "kr", rtl: false },
  { code: "ru", label: "Russian", native: "Русский", flag: "ru", rtl: false },
  { code: "tr", label: "Turkish", native: "Türkçe", flag: "tr", rtl: false },
  { code: "hi", label: "Hindi", native: "हिन्दी", flag: "in", rtl: false },
  { code: "sw", label: "Swahili", native: "Kiswahili", flag: "tz", rtl: false },
] as const;

export type Lang = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const DEFAULT_LANG: Lang = "en";

export const LANG_MAP = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l])
) as Record<Lang, (typeof SUPPORTED_LANGUAGES)[number]>;

export function isRtlLang(lang: Lang): boolean {
  return LANG_MAP[lang]?.rtl ?? false;
}

export function extractLangFromPath(pathname: string): Lang | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && SUPPORTED_LANGUAGES.some((l) => l.code === segments[0])) {
    return segments[0] as Lang;
  }
  return null;
}

export function getLocalizedPath(pathname: string, targetLang: Lang): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && SUPPORTED_LANGUAGES.some((l) => l.code === segments[0])) {
    segments.shift();
  }
  const barePath = "/" + segments.join("/");
  if (targetLang === DEFAULT_LANG) return barePath || "/";
  return "/" + targetLang + (barePath === "/" ? "" : barePath);
}

export const GEOLOCATION_LANG: Record<string, Lang> = {
  GH: "en", NG: "en", KE: "en", ZA: "en", UG: "en",
  FR: "fr", CA: "fr", BE: "fr", CH: "fr",
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es",
  DE: "de", AT: "de",
  IT: "it",
  PT: "pt", BR: "pt",
  SA: "ar", AE: "ar", EG: "ar", IQ: "ar", JO: "ar", KW: "ar", QA: "ar",
  CN: "zh", TW: "zh", SG: "zh",
  JP: "ja",
  KR: "ko",
  RU: "ru",
  TR: "tr",
  IN: "hi",
  TZ: "sw",
};

export const BROWSER_LANG_MAP: Record<string, Lang> = {
  en: "en", "en-US": "en", "en-GB": "en",
  fr: "fr", "fr-FR": "fr", "fr-CA": "fr",
  es: "es", "es-ES": "es", "es-MX": "es",
  de: "de", "de-DE": "de",
  it: "it", "it-IT": "it",
  pt: "pt", "pt-BR": "pt", "pt-PT": "pt",
  ar: "ar",
  zh: "zh", "zh-CN": "zh", "zh-TW": "zh",
  ja: "ja", "ja-JP": "ja",
  ko: "ko", "ko-KR": "ko",
  ru: "ru", "ru-RU": "ru",
  tr: "tr", "tr-TR": "tr",
  hi: "hi", "hi-IN": "hi",
  sw: "sw",
};
