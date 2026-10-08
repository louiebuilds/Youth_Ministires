import "server-only";

import { getPublicEnvironment } from "@/config/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import type { CreateManagedInvitationInput } from "@/features/auth/schemas/invitation-management-schema";
import type { ManagedInvitation } from "@/features/auth/types/invitation-management";

type InvitationManagementFailure = {
  success: false;
  reason: "denied" | "unavailable";
};

type CreateInvitationFailure = {
  success: false;
  reason: "denied" | "invalid" | "duplicate" | "unavailable";
};

type RevokeInvitationFailure = {
  success: false;
  reason: "denied" | "invalid" | "unavailable";
};

type CompleteInvitationFailure = {
  success: false;
  reason:
    | "invalid-session"
    | "invalid-invitation"
    | "rejected"
    | "unavailable";
};

async function removeUndeliveredInvitation(invitationId: string) {
  try {
    const admin = createAdminClient();

    await admin
      .from("account_invitations")
      .delete()
      .eq("id", invitationId);
  } catch {
    // Keep internal cleanup failures out of the user-facing response.
  }
}

export async function createManagedInvitation(
  input: CreateManagedInvitationInput,
): Promise<{ success: true } | CreateInvitationFailure> {
  let invitationId: string | null = null;

  try {
    const supabase = await createClient();

    const expiresAt = new Date(
      Date.now() + input.expirationDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data, error } = await supabase.rpc(
      "create_managed_invitation",
      {
        p_email: input.email,
        p_intended_primary_role: input.intendedPrimaryRole,
        p_expires_at: expiresAt,
      },
    );

    if (error) {
      return {
        success: false,
        reason:
          error.code === "42501"
            ? "denied"
            : error.code === "22023"
              ? "invalid"
              : error.code === "23505"
                ? "duplicate"
                : "unavailable",
      };
    }

    invitationId = data;

    const environment = getPublicEnvironment();
    const admin = createAdminClient();

    const { error: deliveryError } =
      await admin.auth.admin.inviteUserByEmail(input.email, {
        redirectTo: `${environment.appUrl}/accept-invitation`,
      });

    if (deliveryError) {
      await removeUndeliveredInvitation(invitationId);

      return {
        success: false,
        reason: "unavailable",
      };
    }

    return {
      success: true,
    };
  } catch {
    if (invitationId) {
      await removeUndeliveredInvitation(invitationId);
    }

    return {
      success: false,
      reason: "unavailable",
    };
  }
}

export async function completeAccountInvitation(
  password: string,
): Promise<{ success: true } | CompleteInvitationFailure> {
  try {
    const supabase = await createClient();

    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();

    if (claimsError || !claimsData?.claims?.sub) {
      return {
        success: false,
        reason: "invalid-session",
      };
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password,
    });

    if (passwordError) {
      return {
        success: false,
        reason: "rejected",
      };
    }

    const { error: invitationError } = await supabase.rpc(
      "accept_account_invitation",
    );

    if (invitationError) {
      return {
        success: false,
        reason:
          invitationError.code === "22023"
            ? "invalid-invitation"
            : invitationError.code === "42501"
              ? "invalid-session"
              : "unavailable",
      };
    }

    await supabase.auth.signOut();

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

export async function listManagedInvitations(): Promise<
  | { success: true; invitations: ManagedInvitation[] }
  | InvitationManagementFailure
> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
      "list_managed_invitations",
    );

    if (error) {
      return {
        success: false,
        reason: error.code === "42501" ? "denied" : "unavailable",
      };
    }

    return {
      success: true,
      invitations: (data ?? []).map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        intendedPrimaryRole: invitation.intended_primary_role,
        status:
          invitation.lifecycle_status as ManagedInvitation["status"],
        invitedAt: invitation.invited_at,
        expiresAt: invitation.expires_at,
        acceptedAt: invitation.accepted_at,
      })),
    };
  } catch {
    return {
      success: false,
      reason: "unavailable",
    };
  }
}

export async function revokeManagedInvitation(
  invitationId: string,
): Promise<{ success: true } | RevokeInvitationFailure> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc("revoke_managed_invitation", {
      p_invitation_id: invitationId,
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
