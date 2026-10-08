import type { Json } from "@/lib/supabase/database.types";

export type AuditResult = "success" | "failure" | "denied";
export type AuditSource = "web" | "api" | "system" | "migration";

export type ManagedAuditEvent = {
  id: number;
  occurredAt: string;
  action: string;
  actorProfileId: string | null;
  actorDisplayName: string | null;
  entityType: string;
  entityId: string | null;
  result: AuditResult;
  source: AuditSource;
  requestId: string | null;
  metadata: Json;
};

export type AuditEventFilters = {
  search?: string;
  action?: string;
  result?: AuditResult;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
};
