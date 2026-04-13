import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, getAdminSessionEmail, verifyAdminSessionToken } from "@/lib/admin-session";
import { logAdminAuditEvent } from "@/lib/admin-audit";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ teacherId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
    if (!verifyAdminSessionToken(token)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const adminEmail = getAdminSessionEmail(token) ?? "unknown";

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: true, offline: true });
    }

    const adminSupabase = supabase as any;

    const { teacherId } = await context.params;
    const payload = (await request.json().catch(() => null)) as { status?: "pending" | "verified" | "rejected"; is_founding_member?: boolean } | null;

    if (!payload) {
      return NextResponse.json({ message: "Missing update payload." }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {};
    if (payload.status) {
      updatePayload.status = payload.status;
    }
    if (typeof payload.is_founding_member === "boolean") {
      updatePayload.is_founding_member = payload.is_founding_member;
    }

    const { error } = await adminSupabase.from("teacher_profiles").update(updatePayload).eq("id", teacherId);
    if (error) {
      return NextResponse.json({ ok: true, offline: true });
    }

    await logAdminAuditEvent("admin.teacher.updated", adminEmail, {
      teacherId,
      ...updatePayload,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, offline: true });
  }
}
