"use server";

import { revalidatePath } from "next/cache";

import { updateManagedAccountSchema } from "@/features/auth/schemas/account-management-schema";
import { updateManagedAccount } from "@/features/auth/services/account-management-service";

import type { ManagedAccountActionState } from "@/features/auth/types/account-management";

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
          ? "This change is not allowed. Your own administrator account must remain active."
          : updateResult.reason === "invalid"
            ? "The account details are invalid. Refresh and try again."
            : "Account management is temporarily unavailable. Please try again.",
    };
  }

  revalidatePath("/settings");

  return {
    success: true,
    message: "Account updated and recorded in the audit log.",
  };
}
