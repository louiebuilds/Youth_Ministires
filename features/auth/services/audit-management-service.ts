import "server-only";

import { createClient } from "@/lib/supabase/server";

import type {
  AuditEventFilters,
  ManagedAuditEvent,
} from "@/features/auth/types/audit-management";

type AuditManagementFailure = {
  success: false;
  reason: "denied" | "invalid" | "unavailable";
};

export async function listManagedAuditEvents(
  filters: AuditEventFilters,
): Promise<
  | { success: true; events: ManagedAuditEvent[] }
  | AuditManagementFailure
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_managed_audit_events", {
      p_search: filters.search || undefined,
      p_action: filters.action || undefined,
      p_result: filters.result,
      p_date_from: filters.dateFrom || undefined,
      p_date_to: filters.dateTo || undefined,
      p_limit: filters.limit ?? 100,
    });

    if (error) {
      return {
        success: false,
        reason:
          error.code === "42501"
            ? "denied"
            : error.code === "22023"
              ? "invalid"
              : "unavailable",
      };
    }

    return {
      success: true,
      events: (data ?? []).map((event) => ({
        id: event.id,
        occurredAt: event.occurred_at,
        action: event.action,
        actorProfileId: event.actor_profile_id,
        actorDisplayName: event.actor_display_name,
        entityType: event.entity_type,
        entityId: event.entity_id,
        result: event.result,
        source: event.source,
        requestId: event.request_id,
        metadata: event.metadata,
      })),
    };
  } catch {
    return { success: false, reason: "unavailable" };
  }
}
