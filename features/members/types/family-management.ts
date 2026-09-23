export type FamilyManagementState =
  | { success: true; message: string }
  | { success: false; message?: string };

export type ParentAccountLinkCandidate = {
  profileId: string;
  accountEmail: string;
  displayName: string;
  accountRole: "parent";
  accountStatus: AccountStatus;
  linkedPersonId: string | null;
  linkedPersonName: string | null;
  linkedHouseholds: string[];
  emailMatches: boolean;
  matchingActivePeopleCount: number;
};
import type { AccountStatus } from "@/lib/supabase/database.types";
