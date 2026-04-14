import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, getAdminSessionEmail, verifyAdminSessionToken } from "@/lib/admin-session";
import { logAdminAuditEvent } from "@/lib/admin-audit";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ profileId: string }>;
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

    const { profileId } = await context.params;
    const adminSupabase = supabase as any;

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("id,role,name")
      .eq("id", profileId)
      .maybeSingle();

    const deleteResult = await adminSupabase.auth.admin.deleteUser(profileId);
    if (deleteResult.error) {
      const message = deleteResult.error.message ?? "Unable to delete account.";
      const isNotFound = /not found/i.test(message);
      if (!isNotFound) {
        return NextResponse.json({ message }, { status: 500 });
      }

      // Fallback cleanup for orphaned rows if auth user is already missing.
      await Promise.all([
        adminSupabase.from("reviews").delete().eq("parent_id", profileId),
        adminSupabase.from("teacher_profiles").delete().eq("user_id", profileId),
        adminSupabase.from("profiles").delete().eq("id", profileId),
      ]);
    }

    await logAdminAuditEvent("admin.account.deleted", adminEmail, {
      profileId,
      role: profile?.role ?? null,
      name: profile?.name ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, offline: true });
  }
}
