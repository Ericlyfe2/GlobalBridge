export { i18nMiddleware as default } from "@/i18n/middleware";

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.svg|robots.txt|sitemap.xml).*)",
  ],
};
