"use server";

import { registerSchema } from "@/features/auth/schemas/register-schema";
import { signUpWithPassword } from "@/features/auth/services/auth-service";

import type { RegisterActionState } from "@/features/auth/types/register";

export async function registerAction(
  _previousState: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  const result = registerSchema.safeParse({
    email: formData.get("email"),
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

  const signUpResult = await signUpWithPassword(result.data);

  if (!signUpResult.success) {
    return {
      success: false,
      message:
        signUpResult.reason === "unavailable"
          ? "Registration is temporarily unavailable. Please try again."
          : "We could not complete registration. Review your information and try again.",
    };
  }

  return {
    success: true,
    message:
      "Check your email to confirm your account. Ministry access is assigned separately after approval.",
  };
}
