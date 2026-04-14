import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "docent_admin_session";

function isAdminPage(pathname: string) {
  return pathname.startsWith("/admin") && pathname !== "/admin/login";
}

function isProtectedAdminApi(pathname: string) {
  if (!pathname.startsWith("/api/admin")) {
    return false;
  }

  if (pathname === "/api/admin/login" || pathname === "/api/admin/logout") {
    return false;
  }

  return true;
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isAdminPage(pathname) && !isProtectedAdminApi(pathname)) {
    return withSecurityHeaders(NextResponse.next());
  }

  // Fast-path gate: detailed token verification still happens inside admin routes/pages.
  const hasSessionCookie = Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (hasSessionCookie) {
    return withSecurityHeaders(NextResponse.next());
  }

  if (isProtectedAdminApi(pathname)) {
    return withSecurityHeaders(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/admin/login";
  redirectUrl.search = "";
  return withSecurityHeaders(NextResponse.redirect(redirectUrl));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
