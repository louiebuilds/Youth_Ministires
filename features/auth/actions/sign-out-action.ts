"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type SignOutActionState = {
  success: boolean;
  message?: string;
};

export async function signOutAction(
  state: SignOutActionState,
): Promise<SignOutActionState> {
  void state;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return {
        success: false,
        message: "Sign out is temporarily unavailable. Please try again.",
      };
    }
  } catch {
    return {
      success: false,
      message: "Sign out is temporarily unavailable. Please try again.",
    };
  }

  // Purge authenticated client route state before handing the browser to the
  // signed-out experience so Back/Forward cannot restore manager UI.
  revalidatePath("/", "layout");
  return { success: true };
}
