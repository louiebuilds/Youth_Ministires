import type {
  AccountRole,
  AccountStatus,
} from "@/lib/supabase/database.types";

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
