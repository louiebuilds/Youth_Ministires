import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AccountRole } from "@/lib/supabase/database.types";

export type AuthenticatedAccount = Readonly<{
  displayName: string;
  email: string;
  id: string;
  role: AccountRole;
}>;

export const getAuthenticatedAccount = cache(
  async (): Promise<AuthenticatedAccount | null> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const id = data?.claims?.sub;
    const email = data?.claims?.email;

    if (error || typeof id !== "string" || typeof email !== "string") {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, primary_role, status")
      .eq("id", id)
      .eq("status", "active")
      .single();

    if (profileError || !profile || profile.status !== "active") {
      return null;
    }

    return {
      displayName: profile.display_name,
      email,
      id,
      role: profile.primary_role,
    };
  } catch {
    return null;
  }
  },
);

export async function getAuthenticatedUserId() {
  const account = await getAuthenticatedAccount();

  return account?.id ?? null;
}
