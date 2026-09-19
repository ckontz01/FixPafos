import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

/**
 * Resolves the display language before the page renders.
 *
 * Doing this here rather than in a client effect means the server already
 * renders the first paint in the right language: there is no flash of another
 * language, and no post-hydration state update. `?lang=` is an explicit
 * override that also persists, which keeps the end-to-end verification scripts
 * deterministic and gives people a shareable link in a chosen language.
 *
 * The cookie holds a display preference only. It carries no personal data and
 * is deliberately not HttpOnly, so the language switcher can update it directly.
 */
export function proxy(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("lang");
  if (!isLocale(requested)) return NextResponse.next();
  if (request.cookies.get(LOCALE_COOKIE)?.value === requested)
    return NextResponse.next();

  // Update the request so this same render already sees the new preference.
  request.cookies.set(LOCALE_COOKIE, requested);
  const response = NextResponse.next({ request });
  response.cookies.set(LOCALE_COOKIE, requested, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
    httpOnly: false,
  });
  return response;
}

export const config = {
  // Pages only: API routes, static assets and image optimisation are unaffected.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
