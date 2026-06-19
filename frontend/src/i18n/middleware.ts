import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, SUPPORTED_LANGUAGES, type Lang } from "./config";

const COOKIE_NAME = "gb-lang";

export function getLangFromRequest(request: NextRequest): Lang {
  const cookieLang = request.cookies.get(COOKIE_NAME)?.value as Lang | undefined;
  if (cookieLang && SUPPORTED_LANGUAGES.some((l) => l.code === cookieLang)) {
    return cookieLang;
  }

  const acceptLang = request.headers.get("accept-language");
  if (acceptLang) {
    const preferred = acceptLang.split(",")[0]?.split("-")[0] as Lang | undefined;
    if (preferred && SUPPORTED_LANGUAGES.some((l) => l.code === preferred)) {
      return preferred;
    }
  }

  return DEFAULT_LANG;
}

export function i18nMiddleware(request: NextRequest) {
  const lang = getLangFromRequest(request);

  const response = NextResponse.next();

  if (!request.cookies.has(COOKIE_NAME)) {
    response.cookies.set(COOKIE_NAME, lang, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
    });
  }

  response.headers.set("x-language", lang);

  return response;
}
