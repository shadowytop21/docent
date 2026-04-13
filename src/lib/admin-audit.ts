import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function logAdminAuditEvent(action: string, actorEmail: string, metadata: Record<string, unknown> = {}) {
  try {
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return;
    }

    await (supabase as any).from("admin_audit_logs").insert({
      action,
      actor_email: actorEmail,
      metadata,
    });
  } catch {
    // Never fail user-facing admin actions because audit logging failed.
  }
}
