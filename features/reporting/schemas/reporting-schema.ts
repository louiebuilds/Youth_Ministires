import { z } from "zod";

export const reportTypeSchema = z.enum([
  "overview", "attendance", "events", "volunteers", "growth", "ministry_health",
]);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const reportingRangeSchema = z.object({
  fromDate: dateSchema,
  toDate: dateSchema,
}).superRefine((value, context) => {
  const from = Date.parse(`${value.fromDate}T00:00:00Z`);
  const to = Date.parse(`${value.toDate}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from || (to-from)/86_400_000 > 366) {
    context.addIssue({ code: "custom", message: "Choose a valid range of 366 days or fewer." });
  }
});

const presetSchema = z.enum(["30", "90", "ytd", "365"]);
export type ReportingRangeSearch = { preset?: string; from?: string; to?: string };
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export function resolveReportingRange(search: ReportingRangeSearch, now = new Date()) {
  if (search.from !== undefined || search.to !== undefined) {
    const parsed = reportingRangeSchema.safeParse({ fromDate: search.from, toDate: search.to });
    return parsed.success
      ? { success: true as const, range: parsed.data }
      : { success: false as const, message: parsed.error.issues[0]?.message ?? "Invalid reporting range." };
  }
  const preset = presetSchema.safeParse(search.preset ?? "30");
  if (!preset.success) return { success: false as const, message: "Choose a valid reporting range." };
  const start = new Date(now);
  if (preset.data === "90") start.setUTCDate(start.getUTCDate() - 89);
  else if (preset.data === "ytd") start.setUTCMonth(0, 1);
  else if (preset.data === "365") start.setUTCDate(start.getUTCDate() - 365);
  else start.setUTCDate(start.getUTCDate() - 29);
  const parsed = reportingRangeSchema.safeParse({ fromDate: isoDate(start), toDate: isoDate(now) });
  return parsed.success
    ? { success: true as const, range: parsed.data }
    : { success: false as const, message: parsed.error.issues[0]?.message ?? "Invalid reporting range." };
}

export const savedReportSchema = z.object({
  name: z.string().trim().min(1).max(120),
  reportType: reportTypeSchema,
  fromDate: dateSchema,
  toDate: dateSchema,
});

export const savedReportIdSchema = z.object({ id: z.string().uuid() });
export const renameSavedReportSchema = savedReportIdSchema.extend({ name: z.string().trim().min(1).max(120) });
