"use server";
import { revalidatePath } from "next/cache";
import { archiveSavedReport,createSavedReport,renameSavedReport } from "@/features/reporting/services/reporting-service";
import { renameSavedReportSchema,savedReportIdSchema,savedReportSchema } from "@/features/reporting/schemas/reporting-schema";
export async function createSavedReportAction(formData:FormData){const parsed=savedReportSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)return;const {name,reportType,fromDate,toDate}=parsed.data;await createSavedReport(name,reportType,{fromDate,toDate});revalidatePath("/reports");}
export async function renameSavedReportAction(formData:FormData){const parsed=renameSavedReportSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)return;await renameSavedReport(parsed.data.id,parsed.data.name);revalidatePath("/reports");}
export async function archiveSavedReportAction(formData:FormData){const parsed=savedReportIdSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)return;await archiveSavedReport(parsed.data.id);revalidatePath("/reports");}
