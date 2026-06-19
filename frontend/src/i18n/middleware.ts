import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, extractLangFromPath, SUPPORTED_LANGUAGES, type Lang } from "./config";

const COOKIE_NAME = "gb-lang";
const LOCALE_CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

export function getLangFromRequest(request: NextRequest): Lang {
  const cookieLang = request.cookies.get(COOKIE_NAME)?.value as Lang | undefined;
  if (cookieLang && LOCALE_CODES.has(cookieLang)) return cookieLang;
  const acceptLang = request.headers.get("accept-language");
  if (acceptLang) {
    const preferred = acceptLang.split(",")[0]?.split("-")[0] as Lang | undefined;
    if (preferred && LOCALE_CODES.has(preferred)) return preferred;
  }
  return DEFAULT_LANG;
}

function setLangCookie(response: NextResponse, lang: Lang) {
  response.cookies.set(COOKIE_NAME, lang, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
  });
}

export function i18nMiddleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const localeFromPath = extractLangFromPath(pathname);

  if (localeFromPath) {
    if (
      pathname.startsWith(`/${localeFromPath}/api/`) ||
      pathname.startsWith(`/${localeFromPath}/_next/`)
    ) {
      return NextResponse.next();
    }
    const segments = pathname.split("/").filter(Boolean);
    segments.shift();
    const newPath = "/" + segments.join("/");
    request.nextUrl.pathname = newPath;
    const response = NextResponse.rewrite(request.nextUrl);
    setLangCookie(response, localeFromPath);
    response.headers.set("x-language", localeFromPath);
    response.headers.set("x-locale-prefix", localeFromPath);
    return response;
  }

  const preferredLang = getLangFromRequest(request);

  if (preferredLang !== DEFAULT_LANG) {
    const suffix = pathname === "/" ? "" : pathname;
    const redirectUrl = new URL(`/${preferredLang}${suffix}${search}`, request.url);
    const response = NextResponse.redirect(redirectUrl);
    setLangCookie(response, preferredLang);
    response.headers.set("x-language", preferredLang);
    return response;
  }

  const response = NextResponse.next();
  if (!request.cookies.has(COOKIE_NAME)) {
    setLangCookie(response, DEFAULT_LANG);
  }
  response.headers.set("x-language", DEFAULT_LANG);
  return response;
}
