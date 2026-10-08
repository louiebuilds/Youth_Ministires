"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createManagedInvitationSchema,
  revokeManagedInvitationSchema,
} from "@/features/auth/schemas/invitation-management-schema";
import {
  createManagedInvitation,
  revokeManagedInvitation,
} from "@/features/auth/services/invitation-management-service";

import type {
  ManagedInvitationActionState,
  RevokeManagedInvitationActionState,
} from "@/features/auth/types/invitation-management";

export async function createManagedInvitationAction(
  _previousState: ManagedInvitationActionState,
  formData: FormData,
): Promise<ManagedInvitationActionState> {
  const result = createManagedInvitationSchema.safeParse({
    email: formData.get("email"),
    intendedPrimaryRole: formData.get("intendedPrimaryRole"),
    expirationDays: formData.get("expirationDays"),
  });

  if (!result.success) {
    return {
      success: false,
      message: "Review the highlighted fields and try again.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const createResult = await createManagedInvitation(result.data);

  if (!createResult.success) {
    return {
      success: false,
      message:
        createResult.reason === "denied"
          ? "You do not have permission to send invitations."
          : createResult.reason === "invalid"
            ? "The invitation details are invalid. Review them and try again."
            : createResult.reason === "duplicate"
              ? "A pending invitation already exists for this email address."
              : "The invitation could not be sent. Please try again.",
    };
  }

  revalidatePath("/administration/invitations");

  return { success: true, message: "Invitation sent successfully." };
}

export async function revokeManagedInvitationAction(
  _previousState: RevokeManagedInvitationActionState,
  formData: FormData,
): Promise<RevokeManagedInvitationActionState> {
  const result = revokeManagedInvitationSchema.safeParse({
    invitationId: formData.get("invitationId"),
  });

  if (!result.success) {
    return {
      success: false,
      message: "This invitation is invalid or no longer available.",
    };
  }

  const revokeResult = await revokeManagedInvitation(
    result.data.invitationId,
  );

  if (!revokeResult.success) {
    return {
      success: false,
      message:
        revokeResult.reason === "denied"
          ? "You do not have permission to revoke this invitation."
          : revokeResult.reason === "invalid"
            ? "This invitation is no longer available to revoke."
            : "The invitation could not be revoked. Please try again.",
    };
  }

  revalidatePath("/administration/invitations");
  redirect("/administration/invitations?notice=revoked");
}
