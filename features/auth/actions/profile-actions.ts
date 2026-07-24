"use server";

import { revalidatePath } from "next/cache";

import { updatePasswordSchema } from "@/features/auth/schemas/password-recovery-schema";
import { updateProfileSchema } from "@/features/auth/schemas/profile-schema";
import { updatePassword } from "@/features/auth/services/auth-service";
import { updateOwnProfile } from "@/features/auth/services/profile-service";

import type { UpdatePasswordState } from "@/features/auth/types/password-recovery";
import type { ProfileActionState } from "@/features/auth/types/profile";

export async function updateProfileAction(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const result = updateProfileSchema.safeParse({
    displayName: formData.get("displayName"),
  });

  if (!result.success) {
    return {
      success: false,
      message: "Review the highlighted field and try again.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const updateResult = await updateOwnProfile(result.data.displayName);

  if (!updateResult.success) {
    return {
      success: false,
      message:
        updateResult.reason === "denied"
          ? "Your active session could not be verified. Sign in and try again."
          : "Your profile is temporarily unavailable. Please try again.",
    };
  }

  revalidatePath("/profile");

  return {
    success: true,
    message: "Your display name was updated.",
  };
}

export async function changePasswordAction(
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

  const updateResult = await updatePassword(result.data.password);

  if (!updateResult.success) {
    return {
      success: false,
      message:
        updateResult.reason === "invalid-session"
          ? "Your session is invalid or expired. Sign in and try again."
          : updateResult.reason === "unavailable"
            ? "Password changes are temporarily unavailable. Please try again."
            : "We could not update your password. Please try again.",
    };
  }

  return {
    success: true,
    message: "Your password was updated and your session ended securely.",
  };
}
