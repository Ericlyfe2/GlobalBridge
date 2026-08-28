import { i18nMiddleware } from "@/i18n/middleware";

export default i18nMiddleware;

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.svg|robots.txt|sitemap.xml).*)",
  ],
};
