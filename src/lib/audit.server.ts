import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function logAudit(opts: {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: opts.actorId,
      action: opts.action,
      target_type: opts.targetType ?? null,
      target_id: opts.targetId ?? null,
      meta: opts.meta ?? {},
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
