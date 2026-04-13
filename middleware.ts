import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "tutornest_admin_session";

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isAdminPage(pathname) && !isProtectedAdminApi(pathname)) {
    return NextResponse.next();
  }

  // Fast-path gate: detailed token verification still happens inside admin routes/pages.
  const hasSessionCookie = Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (hasSessionCookie) {
    return NextResponse.next();
  }

  if (isProtectedAdminApi(pathname)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/admin/login";
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
