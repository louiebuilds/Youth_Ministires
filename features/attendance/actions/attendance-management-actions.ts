"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  attendanceRecordSchema,
  attendanceSessionIdSchema,
  attendanceSessionSchema,
} from "@/features/attendance/schemas/attendance-management-schema";
import {
  createAttendanceSession,
  finalizeAttendanceSession,
  saveAttendanceRecord,
} from "@/features/attendance/services/attendance-management-service";

import type { AttendanceActionState } from "@/features/attendance/types/attendance-management";

const refresh = (sessionId: string) => {
  revalidatePath("/attendance");
  revalidatePath(`/attendance/${sessionId}`);
};

export async function createAttendanceSessionAction(
  _state: AttendanceActionState, formData: FormData,
): Promise<AttendanceActionState> {
  const parsed = attendanceSessionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || Boolean(parsed.data.startsAt) !== Boolean(parsed.data.endsAt) ||
    (parsed.data.startsAt && parsed.data.endsAt &&
      parsed.data.endsAt <= parsed.data.startsAt)) {
    return { success: false, message: "Review the attendance session." };
  }
  const result = await createAttendanceSession(parsed.data);
  if (!result.success) {
    return { success: false, message: "This session could not be created." };
  }
  revalidatePath("/attendance");
  redirect(`/attendance/${result.sessionId}`);
}

export async function saveAttendanceRecordAction(
  _state: AttendanceActionState, formData: FormData,
): Promise<AttendanceActionState> {
  const parsed = attendanceRecordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, message: "Review this attendance record." };
  }
  if (!await saveAttendanceRecord(parsed.data)) {
    return { success: false, message: "This attendance change was not allowed." };
  }
  refresh(parsed.data.sessionId);
  return { success: true, message: "Attendance saved and audited." };
}

export async function finalizeAttendanceSessionAction(
  _state: AttendanceActionState, formData: FormData,
): Promise<AttendanceActionState> {
  const parsed = attendanceSessionIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !await finalizeAttendanceSession(parsed.data.sessionId)) {
    return { success: false, message: "This session could not be finalized." };
  }
  refresh(parsed.data.sessionId);
  return { success: true, message: "Attendance session finalized and audited." };
}
