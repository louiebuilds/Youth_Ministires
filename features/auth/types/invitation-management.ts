import type { AccountRole } from "@/lib/supabase/database.types";

export type InvitationLifecycleStatus =
  | "pending"
  | "accepted"
  | "revoked"
  | "expired";

export type ManagedInvitation = {
  id: string;
  email: string;
  intendedPrimaryRole: AccountRole;
  status: InvitationLifecycleStatus;
  invitedAt: string;
  expiresAt: string;
  acceptedAt: string | null;
};

export type ManagedInvitationActionState =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message?: string;
      fieldErrors?: {
        email?: string[];
        intendedPrimaryRole?: string[];
        expirationDays?: string[];
      };
    };

export type RevokeManagedInvitationActionState =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message?: string;
    };
