import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logAdminAuditEvent } from "@/lib/admin-audit";
import { ADMIN_SESSION_COOKIE, getAdminSessionEmail, verifyAdminSessionToken } from "@/lib/admin-session";

export async function POST() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (verifyAdminSessionToken(token)) {
    await logAdminAuditEvent("admin.logout", getAdminSessionEmail(token) ?? "unknown");
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
