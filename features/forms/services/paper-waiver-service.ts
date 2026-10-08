import "server-only";

import { createClient } from "@/lib/supabase/server";

type RpcResult = {
  data: unknown;
  error: { message: string } | null;
};

export async function recordPaperEventWaiver(
  requirementId: string,
  studentId: string,
  reason?: string,
): Promise<string> {
  const client = await createClient();

  const result = await (
    client as unknown as {
      rpc: (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<RpcResult>;
    }
  ).rpc("record_paper_event_waiver", {
    p_requirement_id: requirementId,
    p_student_id: studentId,
    p_reason: reason?.trim() || null,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return String(result.data);
}