import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { ManagedAccount } from "@/features/auth/types/account-management";
import type {
  AccountRole,
  AccountStatus,
} from "@/lib/supabase/database.types";

type AccountManagementFailure = {
  success: false;
  reason: "denied" | "invalid" | "unavailable";
};

export async function listManagedAccounts(
  search: string,
): Promise<
  | { success: true; accounts: ManagedAccount[] }
  | AccountManagementFailure
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_managed_accounts", {
      p_search: search || null,
    });

    if (error) {
      return {
        success: false,
        reason: error.code === "42501" ? "denied" : "unavailable",
      };
    }

    return {
      success: true,
      accounts: (data ?? []).map((account) => ({
        id: account.id,
        email: account.email,
        displayName: account.display_name,
        primaryRole: account.primary_role,
        status: account.status,
        createdAt: account.created_at,
        updatedAt: account.updated_at,
      })),
    };
  } catch {
    return {
      success: false,
      reason: "unavailable",
    };
  }
}

export async function updateManagedAccount(input: {
  profileId: string;
  displayName: string;
  primaryRole: AccountRole;
  status: AccountStatus;
}): Promise<{ success: true } | AccountManagementFailure> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_update_account", {
      p_profile_id: input.profileId,
      p_display_name: input.displayName,
      p_primary_role: input.primaryRole,
      p_status: input.status,
    });

    if (error) {
      return {
        success: false,
        reason:
          error.code === "42501"
            ? "denied"
            : error.code === "22023"
              ? "invalid"
              : "unavailable",
      };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      reason: "unavailable",
    };
  }
}
