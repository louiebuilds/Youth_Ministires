import "server-only";

import { requestPasswordReset } from "@/features/auth/services/auth-service";
import { getAuthenticatedAccount } from "@/features/auth/services/session-service";
import {
  getRoleCapabilities,
  hasCapability,
} from "@/features/auth/types/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import type {
  EffectiveCapability,
  ManagedAccount,
  ManagedAccountAccess,
  ManagedCapabilityGrant,
} from "@/features/auth/types/account-management";
import type { PlatformCapability } from "@/features/auth/types/authorization";
import type {
  AccountRole,
  AccountStatus,
} from "@/lib/supabase/database.types";

type AccountManagementFailure = {
  success: false;
  reason: "denied" | "invalid" | "unavailable";
};

type ManagedPasswordResetFailure = {
  success: false;
  reason: "denied" | "invalid" | "rate-limited" | "unavailable";
};

type ManagedCapabilityFailure = {
  success: false;
  reason:
    | "already-granted"
    | "denied"
    | "invalid-capability"
    | "invalid-target"
    | "unavailable";
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

export async function sendManagedAccountPasswordReset(
  profileId: string,
): Promise<
  | { success: true; auditConfirmed: boolean; email: string }
  | ManagedPasswordResetFailure
> {
  try {
    const actor = await getAuthenticatedAccount();

    if (!actor || !hasCapability(actor.role, "administration.manage")) {
      return { success: false, reason: "denied" };
    }

    const admin = createAdminClient();

    const [{ data: profile, error: profileError }, { data, error }] =
      await Promise.all([
        admin
          .from("profiles")
          .select("id, primary_role")
          .eq("id", profileId)
          .maybeSingle(),
        admin.auth.admin.getUserById(profileId),
      ]);

    const email = data.user?.email;

    if (profileError || error || !profile || !email) {
      return { success: false, reason: "invalid" };
    }

    if (
      actor.role === "youth_pastor" &&
      profile.primary_role === "platform_administrator"
    ) {
      return { success: false, reason: "denied" };
    }

    const resetResult = await requestPasswordReset(email);

    if (!resetResult.success) {
      return {
        success: false,
        reason: resetResult.reason,
      };
    }

    try {
      const { error: auditError } = await admin.from("audit_events").insert({
        action: "account.password_reset_requested",
        actor_profile_id: actor.id,
        entity_id: profileId,
        entity_type: "account",
        metadata: { targetProfileId: profileId },
        result: "success",
        source: "web",
      });

      if (auditError) {
        return {
          success: true,
          auditConfirmed: false,
          email,
        };
      }
    } catch {
      return {
        success: true,
        auditConfirmed: false,
        email,
      };
    }

    return {
      success: true,
      auditConfirmed: true,
      email,
    };
  } catch {
    return {
      success: false,
      reason: "unavailable",
    };
  }
}

export async function grantManagedCapability(input: {
  capability:
    | "forms.medical.view"
    | "forms.medical.verify"
    | "forms.participation.override";
  expiresAt: string | null;
  profileId: string;
  reason: string;
}): Promise<{ success: true } | ManagedCapabilityFailure> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc(
      "grant_sensitive_forms_capability",
      {
        p_capability: input.capability,
        p_expires_at: input.expiresAt ?? undefined,
        p_profile_id: input.profileId,
        p_reason: input.reason,
      },
    );

    if (!error) {
      return { success: true };
    }

    if (error.code === "23505") {
      return {
        success: false,
        reason: "already-granted",
      };
    }

    if (error.code === "42501") {
      return {
        success: false,
        reason: "denied",
      };
    }

    if (error.code === "22P02") {
      return {
        success: false,
        reason: "invalid-capability",
      };
    }

    if (error.code === "22023") {
      if (error.message.includes("target")) {
        return {
          success: false,
          reason: "invalid-target",
        };
      }

      if (error.message.includes("not individually grantable")) {
        return {
          success: false,
          reason: "invalid-capability",
        };
      }

      return {
        success: false,
        reason: "unavailable",
      };
    }

    return {
      success: false,
      reason: "unavailable",
    };
  } catch {
    return {
      success: false,
      reason: "unavailable",
    };
  }
}

export async function revokeManagedCapability(input: {
  grantId: string;
  reason: string;
}): Promise<{ success: true } | ManagedCapabilityFailure> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc(
      "revoke_sensitive_forms_capability",
      {
        p_grant_id: input.grantId,
        p_reason: input.reason,
      },
    );

    if (!error) {
      return { success: true };
    }

    if (error.code === "42501") {
      return {
        success: false,
        reason: "denied",
      };
    }

    if (error.code === "22023" || error.code === "P0002") {
      return {
        success: false,
        reason: "invalid-target",
      };
    }

    return {
      success: false,
      reason: "unavailable",
    };
  } catch {
    return {
      success: false,
      reason: "unavailable",
    };
  }
}

export async function getManagedAccountAccess(
  profileId: string,
): Promise<
  | { success: true; access: ManagedAccountAccess }
  | AccountManagementFailure
> {
  try {
    const actor = await getAuthenticatedAccount();

    if (!actor || !hasCapability(actor.role, "administration.manage")) {
      return {
        success: false,
        reason: "denied",
      };
    }

    const admin = createAdminClient();

    const [profileResult, userResult, grantsResult] = await Promise.all([
      admin
        .from("profiles")
        .select(
          "id, display_name, primary_role, status, created_at, updated_at",
        )
        .eq("id", profileId)
        .maybeSingle(),
      admin.auth.admin.getUserById(profileId),
      admin
        .from("profile_capability_grants")
        .select(
          "id, capability, grant_reason, granted_at, granted_by_profile_id, expires_at, revocation_reason, revoked_at, revoked_by_profile_id",
        )
        .eq("profile_id", profileId)
        .order("granted_at", { ascending: false }),
    ]);

    const profile = profileResult.data;
    const email = userResult.data.user?.email;
    const grantRows = grantsResult.data;

    if (
      profileResult.error ||
      grantsResult.error ||
      !grantRows
    ) {
      return {
        success: false,
        reason: "unavailable",
      };
    }

    if (!profile || userResult.error || !email) {
      return {
        success: false,
        reason: "invalid",
      };
    }

    if (
      actor.role === "youth_pastor" &&
      profile.primary_role === "platform_administrator"
    ) {
      return {
        success: false,
        reason: "denied",
      };
    }

    const relatedProfileIds = [
      ...new Set(
        grantRows
          .flatMap((grant) => [
            grant.granted_by_profile_id,
            grant.revoked_by_profile_id,
          ])
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const relatedProfilesResult = relatedProfileIds.length
      ? await admin
          .from("profiles")
          .select("id, display_name")
          .in("id", relatedProfileIds)
      : {
          data: [],
          error: null,
        };

    if (relatedProfilesResult.error) {
      return {
        success: false,
        reason: "unavailable",
      };
    }

    const relatedProfileNames = new Map(
      (relatedProfilesResult.data ?? []).map((profile) => [
        profile.id,
        profile.display_name,
      ]),
    );

    const now = Date.now();

    const explicitGrants: ManagedCapabilityGrant[] = grantRows.map(
      (grant) => {
        const status = grant.revoked_at
          ? "revoked"
          : grant.expires_at &&
              new Date(grant.expires_at).getTime() <= now
            ? "expired"
            : "active";

        return {
          id: grant.id,
          capability: grant.capability as PlatformCapability,
          grantReason: grant.grant_reason,
          grantedAt: grant.granted_at,
          grantedBy:
            relatedProfileNames.get(
              grant.granted_by_profile_id,
            ) ?? grant.granted_by_profile_id,
          expiresAt: grant.expires_at,
          revocationReason: grant.revocation_reason,
          revokedAt: grant.revoked_at,
          revokedBy: grant.revoked_by_profile_id
            ? relatedProfileNames.get(
                grant.revoked_by_profile_id,
              ) ?? grant.revoked_by_profile_id
            : null,
          status,
        };
      },
    );

    const roleCapabilities = getRoleCapabilities(
      profile.primary_role,
    );

    const effectiveSources = new Map<
      PlatformCapability,
      EffectiveCapability["source"]
    >(
      profile.status === "active"
        ? roleCapabilities.map((capability) => [
            capability,
            "role",
          ])
        : [],
    );

    for (const grant of explicitGrants) {
      if (
        profile.status !== "active" ||
        grant.status !== "active" ||
        profile.primary_role !== "staff_member"
      ) {
        continue;
      }

      effectiveSources.set(
        grant.capability,
        effectiveSources.has(grant.capability)
          ? "both"
          : "explicit-grant",
      );
    }

    const effectiveCapabilities = [...effectiveSources]
      .map(([capability, source]) => ({
        capability,
        source,
      }))
      .sort((left, right) =>
        left.capability.localeCompare(right.capability),
      );

    return {
      success: true,
      access: {
        account: {
          id: profile.id,
          email,
          displayName: profile.display_name,
          primaryRole: profile.primary_role,
          status: profile.status,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        },
        roleCapabilities,
        explicitGrants,
        effectiveCapabilities,
      },
    };
  } catch {
    return {
      success: false,
      reason: "unavailable",
    };
  }
}