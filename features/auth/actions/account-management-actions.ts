"use server";

import { revalidatePath } from "next/cache";

import {
  grantManagedCapabilitySchema,
  managedAccountPasswordResetSchema,
  revokeManagedCapabilitySchema,
  updateManagedAccountSchema,
} from "@/features/auth/schemas/account-management-schema";
import {
  grantManagedCapability,
  revokeManagedCapability,
  sendManagedAccountPasswordReset,
  updateManagedAccount,
} from "@/features/auth/services/account-management-service";

import type {
  ManagedAccountActionState,
  ManagedCapabilityActionState,
  ManagedAccountPasswordResetActionState,
} from "@/features/auth/types/account-management";

function capabilityErrorMessage(reason: string) {
  if (reason === "denied") return "You do not have permission to manage this capability.";
  if (reason === "invalid-target") return "Capability grants are available only for active Staff Members.";
  if (reason === "invalid-capability") return "The selected capability is not grantable.";
  if (reason === "already-granted") return "This Staff Member already has an active grant for that capability.";
  return "Capability management is temporarily unavailable. Please try again.";
}

export async function grantManagedCapabilityAction(
  _previousState: ManagedCapabilityActionState,
  formData: FormData,
): Promise<ManagedCapabilityActionState> {
  const parsed = grantManagedCapabilitySchema.safeParse({
    capability: formData.get("capability"),
    expiresAt: formData.get("expiresAt"),
    profileId: formData.get("profileId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Review the capability grant details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await grantManagedCapability({
    ...parsed.data,
    expiresAt: parsed.data.expiresAt
      ? new Date(parsed.data.expiresAt).toISOString()
      : null,
  });
  if (!result.success) {
    return { success: false, message: capabilityErrorMessage(result.reason) };
  }

  revalidatePath(`/administration/accounts/${parsed.data.profileId}/access`);
  return { success: true, message: "Capability granted and recorded in the audit log." };
}

export async function revokeManagedCapabilityAction(
  _previousState: ManagedCapabilityActionState,
  formData: FormData,
): Promise<ManagedCapabilityActionState> {
  const parsed = revokeManagedCapabilitySchema.safeParse({
    grantId: formData.get("grantId"),
    profileId: formData.get("profileId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { success: false, message: "Enter a valid revocation reason." };
  }

  const result = await revokeManagedCapability(parsed.data);
  if (!result.success) {
    return { success: false, message: capabilityErrorMessage(result.reason) };
  }

  revalidatePath(`/administration/accounts/${parsed.data.profileId}/access`);
  return { success: true, message: "Capability revoked and recorded in the audit log." };
}

export async function updateManagedAccountAction(
  _previousState: ManagedAccountActionState,
  formData: FormData,
): Promise<ManagedAccountActionState> {
  const result = updateManagedAccountSchema.safeParse({
    profileId: formData.get("profileId"),
    displayName: formData.get("displayName"),
    primaryRole: formData.get("primaryRole"),
    status: formData.get("status"),
  });

  if (!result.success) {
    return {
      success: false,
      message: "Review the highlighted fields and try again.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const updateResult = await updateManagedAccount(result.data);

  if (!updateResult.success) {
    return {
      success: false,
      message:
        updateResult.reason === "denied"
          ? "This account change is not allowed. Administrators must remain active, and Platform Administrator safeguards cannot be bypassed."
          : updateResult.reason === "invalid"
            ? "The account details are invalid. Refresh and try again."
            : "Account management is temporarily unavailable. Please try again.",
    };
  }

  revalidatePath("/administration/accounts");
  revalidatePath("/settings");

  return {
    success: true,
    message: "Account updated and recorded in the audit log.",
  };
}

export async function sendManagedAccountPasswordResetAction(
  _previousState: ManagedAccountPasswordResetActionState,
  formData: FormData,
): Promise<ManagedAccountPasswordResetActionState> {
  const result = managedAccountPasswordResetSchema.safeParse({
    profileId: formData.get("profileId"),
  });

  if (!result.success) {
    return {
      success: false,
      message: "The selected account is invalid or unavailable.",
    };
  }

  const resetResult = await sendManagedAccountPasswordReset(
    result.data.profileId,
  );

  if (!resetResult.success) {
    return {
      success: false,
      message:
        resetResult.reason === "denied"
          ? "You do not have permission to send password reset emails."
          : resetResult.reason === "invalid"
            ? "The selected account is invalid or unavailable."
            : resetResult.reason === "rate-limited"
              ? "Supabase's email sending limit has been reached. Try again later."
              : "The password reset email could not be sent. Please try again.",
    };
  }

  if (!resetResult.auditConfirmed) {
    return {
      success: true,
      warning: true,
      message:
        "Password reset email was sent, but the audit record could not be confirmed. Do not resend immediately because the email has already been sent.",
    };
  }

  return {
    success: true,
    message: `Password reset email sent to ${resetResult.email}.`,
  };
}
