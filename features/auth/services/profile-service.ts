import "server-only";

import { createClient } from "@/lib/supabase/server";

type UpdateOwnProfileResult =
  | {
      success: true;
    }
  | {
      success: false;
      reason: "denied" | "unavailable";
    };

export async function updateOwnProfile(
  displayName: string,
): Promise<UpdateOwnProfileResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_own_profile", {
      p_display_name: displayName,
    });

    if (error) {
      return {
        success: false,
        reason: error.code === "42501" ? "denied" : "unavailable",
      };
    }

    return {
      success: true,
    };
  } catch {
    return {
      success: false,
      reason: "unavailable",
    };
  }
}
