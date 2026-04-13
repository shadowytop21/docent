import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionMaxAge,
} from "@/lib/admin-session";
import { logAdminAuditEvent } from "@/lib/admin-audit";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const rateLimit = checkRateLimit(`admin-login:${ip}`, 8, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ message: "Too many login attempts. Please try again later." }, { status: 429 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return NextResponse.json({ message: "Admin credentials are not configured." }, { status: 500 });
  }

  let body: { email?: string; password?: string };

  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const normalizedAdminEmail = adminEmail.trim().toLowerCase();
  const normalizedAdminPassword = adminPassword.replace(/\r?\n/g, "").trim();

  const validEmail = email === normalizedAdminEmail;
  const validPassword = password === normalizedAdminPassword;

  if (!validEmail || !validPassword) {
    await logAdminAuditEvent("admin.login.failed", email || "unknown", { ip });
    return NextResponse.json({ message: "Invalid admin credentials." }, { status: 401 });
  }

  const token = createAdminSessionToken(email);
  if (!token) {
    return NextResponse.json({ message: "Unable to create admin session." }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getAdminSessionMaxAge(),
  });

  await logAdminAuditEvent("admin.login.success", email, { ip });

  return response;
}
