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

const refresh = () =>
  revalidatePath("/check-in");

export async function checkInStudentAction(
  formData: FormData,
) {
  const parsed =
    studentCheckInSchema.safeParse(
      Object.fromEntries(formData),
    );

  if (parsed.success) {
    await checkInStudent(
      parsed.data.eventId,
      parsed.data.studentId,
    );
  }

  refresh();
}

export async function checkInSelectedStudentsAction(
  formData: FormData,
) {
  const eventIdValue =
    formData.get("eventId");

  if (
    typeof eventIdValue !== "string"
  ) {
    refresh();
    return;
  }

  const studentIds = [
    ...new Set(
      formData
        .getAll("studentId")
        .filter(
          (
            value,
          ): value is string =>
            typeof value === "string",
        ),
    ),
  ];

  for (const studentId of studentIds) {
    const parsed =
      studentCheckInSchema.safeParse({
        eventId: eventIdValue,
        studentId,
      });

    if (!parsed.success) {
      continue;
    }

    await checkInStudent(
      parsed.data.eventId,
      parsed.data.studentId,
    );
  }

  refresh();
}

export async function checkOutStudentAction(
  formData: FormData,
) {
  const parsed =
    studentCheckOutSchema.safeParse(
      Object.fromEntries(formData),
    );

  if (parsed.success) {
    await checkOutStudent(
      parsed.data.eventId,
      parsed.data.studentId,
      parsed.data.pickupPersonId,
      parsed.data.overrideReason,
    );
  }

  refresh();
}

export async function correctStudentCheckInAction(
  formData: FormData,
) {
  const parsed =
    correctStudentCheckInSchema.safeParse(
      Object.fromEntries(formData),
    );

  if (parsed.success) {
    await correctStudentCheckIn(
      parsed.data.eventId,
      parsed.data.studentId,
      parsed.data.reason,
    );
  }

  refresh();
}

export async function checkInVisitorAction(
  formData: FormData,
) {
  const parsed =
    visitorCheckInSchema.safeParse(
      Object.fromEntries(formData),
    );

  if (parsed.success) {
    await checkInVisitor(parsed.data);
  }

  refresh();
}

export async function checkOutVisitorAction(
  formData: FormData,
) {
  const parsed =
    visitorCheckOutSchema.safeParse(
      Object.fromEntries(formData),
    );

  if (parsed.success) {
    await checkOutVisitor(
      parsed.data.visitorId,
    );
  }

  refresh();
}

export async function resolveFamilyTokenAction(
  _state: CheckInActionState,
  formData: FormData,
): Promise<CheckInActionState> {
  const parsed =
    resolveFamilyTokenSchema.safeParse(
      Object.fromEntries(formData),
    );

  if (!parsed.success) {
    return {
      success: false,
      message:
        "Scan the complete family QR pass or enter the full pass value and try again.",
    };
  }

  const result =
    await resolveFamilyToken(
      parsed.data.eventId,
      parsed.data.token,
    );

  if (!result.success) {
    return {
      success: false,
      message:
        result.code === "42501"
          ? "This family pass is invalid, revoked, or unavailable."
          : "The family pass could not be opened. Try again.",
    };
  }

  redirect(
    `/check-in?event=${parsed.data.eventId}` +
      `&household=${result.householdId}` +
      "&pass=opened#selected-family",
  );
}

export async function issueFamilyTokenAction(
  _state: CheckInActionState,
  formData: FormData,
): Promise<CheckInActionState> {
  const parsed =
    familyTokenSchema.safeParse(
      Object.fromEntries(formData),
    );

  if (!parsed.success) {
    return {
      success: false,
      message:
        "Choose a family and try again.",
    };
  }

  const token =
    await issueFamilyToken(
      parsed.data.householdId,
    );

  return token
    ? {
        success: true,
        message:
          "Family QR pass created. This pass remains active until it is replaced or revoked.",
        token,
      }
    : {
        success: false,
        message:
          "A family pass could not be issued.",
      };
}