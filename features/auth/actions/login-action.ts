"use server";

import { revalidatePath } from "next/cache";

import { loginSchema } from "@/features/auth/schemas/login-schema";
import { signInWithPassword } from "@/features/auth/services/auth-service";

import type { LoginActionState } from "@/features/auth/types/login";

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return {
      success: false,
      message: "Review the highlighted fields and try again.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const signInResult = await signInWithPassword(result.data);

  if (!signInResult.success) {
    return {
      success: false,
      message:
        signInResult.reason === "unavailable"
          ? "Sign in is temporarily unavailable. Please try again."
          : "The email or password is incorrect.",
    };
  }

  // An account transition must discard route payloads rendered for any
  // previously authenticated identity in this browser session.
  revalidatePath("/", "layout");
  return { success: true };
}
