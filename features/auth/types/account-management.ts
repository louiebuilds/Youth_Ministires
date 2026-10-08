import type {
  AccountRole,
  AccountStatus,
} from "@/lib/supabase/database.types";
import type { PlatformCapability } from "@/features/auth/types/authorization";

export type ManagedAccount = {
  id: string;
  email: string;
  displayName: string;
  primaryRole: AccountRole;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
};

export type ManagedAccountActionState =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message?: string;
      fieldErrors?: {
        displayName?: string[];
        primaryRole?: string[];
        status?: string[];
      };
    };

export type ManagedAccountPasswordResetActionState =
  | {
      success: true;
      message: string;
      warning?: boolean;
    }
  | {
      success: false;
      message?: string;
    };

export type ManagedCapabilityActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: {
    capability?: string[];
    expiresAt?: string[];
    reason?: string[];
  };
};

export type ManagedCapabilityGrant = {
  id: string;
  capability: PlatformCapability;
  grantReason: string;
  grantedAt: string;
  grantedBy: string;
  expiresAt: string | null;
  revocationReason: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  status: "active" | "expired" | "revoked";
};

export type EffectiveCapability = {
  capability: PlatformCapability;
  source: "role" | "explicit-grant" | "both";
};

export type ManagedAccountAccess = {
  account: ManagedAccount;
  roleCapabilities: readonly PlatformCapability[];
  explicitGrants: ManagedCapabilityGrant[];
  effectiveCapabilities: EffectiveCapability[];
};
