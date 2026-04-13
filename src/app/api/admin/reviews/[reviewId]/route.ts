import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, getAdminSessionEmail, verifyAdminSessionToken } from "@/lib/admin-session";
import { logAdminAuditEvent } from "@/lib/admin-audit";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ reviewId: string }>;
};

export async function DELETE(_: Request, context: RouteContext) {
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

    const { reviewId } = await context.params;
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) {
      return NextResponse.json({ ok: true, offline: true });
    }

    await logAdminAuditEvent("admin.review.deleted", adminEmail, { reviewId });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, offline: true });
  }
}
