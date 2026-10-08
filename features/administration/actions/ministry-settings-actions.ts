"use server";

import { revalidatePath } from "next/cache";

import { ministrySettingsSchema } from "@/features/administration/schemas/ministry-settings-schema";
import { updateMinistrySettings } from "@/features/administration/services/ministry-settings-service";

import type { MinistrySettingsActionState } from "@/features/administration/types/ministry-settings";

export async function updateMinistrySettingsAction(
  _previousState: MinistrySettingsActionState,
  formData: FormData,
): Promise<MinistrySettingsActionState> {
  const parsed = ministrySettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      success: false,
      message: "Review the Ministry Settings fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await updateMinistrySettings(parsed.data);
  if (!result.success) {
    return {
      success: false,
      message:
        result.reason === "denied"
          ? "You do not have permission to update Ministry Settings."
          : result.reason === "invalid"
            ? "One or more settings are invalid. Review the form and try again."
            : "Ministry Settings are temporarily unavailable. Please try again.",
    };
  }

  revalidatePath("/administration/ministry-settings");
  revalidatePath("/communications/compose");
  revalidatePath("/communications/templates/new");
  return { success: true, message: "Ministry Settings saved and audited." };
}
