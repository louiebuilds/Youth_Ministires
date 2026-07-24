"use server";

import { redirect } from "next/navigation";

import { getAuthenticatedUserId } from "@/features/auth/services/session-service";
import { createClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const userId = await getAuthenticatedUserId();

  if (userId) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
