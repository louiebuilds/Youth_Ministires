"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  familyTokenSchema,
  correctStudentCheckInSchema,
  resolveFamilyTokenSchema,
  studentCheckInSchema,
  studentCheckOutSchema,
  visitorCheckInSchema,
  visitorCheckOutSchema,
} from "@/features/check-in/schemas/check-in-schema";
import {
  checkInStudent,
  checkInVisitor,
  checkOutStudent,
  checkOutVisitor,
  correctStudentCheckIn,
  issueFamilyToken,
  resolveFamilyToken,
} from "@/features/check-in/services/check-in-service";

import type { CheckInActionState } from "@/features/check-in/types/check-in";

const refresh = () => revalidatePath("/check-in");

export async function checkInStudentAction(formData: FormData) {
  const parsed = studentCheckInSchema.safeParse(Object.fromEntries(formData));
  if (parsed.success) {
    await checkInStudent(parsed.data.eventId, parsed.data.studentId);
  }
  refresh();
}

export async function checkOutStudentAction(formData: FormData) {
  const parsed = studentCheckOutSchema.safeParse(Object.fromEntries(formData));
  if (parsed.success) {
    await checkOutStudent(
      parsed.data.eventId, parsed.data.studentId,
      parsed.data.pickupPersonId, parsed.data.overrideReason,
    );
  }
  refresh();
}

export async function correctStudentCheckInAction(formData: FormData) {
  const parsed = correctStudentCheckInSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (parsed.success) {
    await correctStudentCheckIn(
      parsed.data.eventId, parsed.data.studentId, parsed.data.reason,
    );
  }
  refresh();
}

export async function checkInVisitorAction(formData: FormData) {
  const parsed = visitorCheckInSchema.safeParse(Object.fromEntries(formData));
  if (parsed.success) await checkInVisitor(parsed.data);
  refresh();
}

export async function checkOutVisitorAction(formData: FormData) {
  const parsed = visitorCheckOutSchema.safeParse(Object.fromEntries(formData));
  if (parsed.success) await checkOutVisitor(parsed.data.visitorId);
  refresh();
}

export async function resolveFamilyTokenAction(
  _state: CheckInActionState,
  formData: FormData,
): Promise<CheckInActionState> {
  const parsed = resolveFamilyTokenSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      success: false,
      message: "Paste the complete scanner fallback value and try again.",
    };
  }
  const result = await resolveFamilyToken(
    parsed.data.eventId, parsed.data.token,
  );
  if (!result.success) {
    return {
      success: false,
      message: result.code === "42501"
        ? "This pass is invalid, expired, already used, or unavailable for this event."
        : "The family pass could not be opened. Try again.",
    };
  }
  redirect(
    `/check-in?event=${parsed.data.eventId}&household=${result.householdId}` +
    "&pass=opened#selected-family",
  );
}

export async function issueFamilyTokenAction(
  _state: CheckInActionState,
  formData: FormData,
): Promise<CheckInActionState> {
  const parsed = familyTokenSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, message: "Choose a family and try again." };
  }
  const token = await issueFamilyToken(parsed.data.householdId);
  return token
    ? {
        success: true,
        message: "Pass issued for 15 minutes and one use.",
        token,
      }
    : { success: false, message: "A pass could not be issued." };
}
