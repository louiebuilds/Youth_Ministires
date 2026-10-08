"use server";

import {
  passwordResetRequestSchema,
  updatePasswordSchema,
} from "@/features/auth/schemas/password-recovery-schema";
import {
  requestPasswordReset,
  updatePassword,
} from "@/features/auth/services/auth-service";
import { completeAccountInvitation } from "@/features/auth/services/invitation-management-service";

import type {
  PasswordResetRequestState,
  UpdatePasswordState,
} from "@/features/auth/types/password-recovery";

export async function requestPasswordResetAction(
  _previousState: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const result = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!result.success) {
    return {
      success: false,
      message: "Enter a valid email address.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const resetResult = await requestPasswordReset(result.data.email);

  if (!resetResult.success) {
    return {
      success: false,
      message:
        "Password recovery is temporarily unavailable. Please try again.",
    };
  }

  return {
    success: true,
    message:
      "If an eligible account matches that email address, recovery instructions will be sent.",
  };
}

export async function updatePasswordAction(
  _previousState: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const result = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!result.success) {
    return {
      success: false,
      message: "Review the highlighted fields and try again.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const flow = formData.get("flow");

  if (flow === "invitation") {
    const invitationResult = await completeAccountInvitation(
      result.data.password,
    );

    if (!invitationResult.success) {
      return {
        success: false,
        message:
          invitationResult.reason === "invalid-session"
            ? "This invitation link is invalid or has expired."
            : invitationResult.reason === "invalid-invitation"
              ? "This invitation is no longer available. Contact a ministry administrator for a new invitation."
              : invitationResult.reason === "unavailable"
                ? "Account setup is temporarily unavailable. Please try again."
                : "We could not complete your account setup. Please try again.",
      };
    }

    return {
      success: true,
      message:
        "Your account is ready. Sign in with your email address and new password.",
    };
  }

  const updateResult = await updatePassword(result.data.password);

  if (!updateResult.success) {
    return {
      success: false,
      message:
        updateResult.reason === "invalid-session"
          ? "This recovery link is invalid or has expired. Request a new link."
          : updateResult.reason === "unavailable"
            ? "Password recovery is temporarily unavailable. Please try again."
            : "We could not update your password. Please try again.",
    };
  }

  return {
    success: true,
    message: "Your password was updated. Sign in with your new password.",
  };
}
