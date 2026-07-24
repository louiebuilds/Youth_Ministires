import type { HouseholdStatus } from "@/lib/supabase/database.types";

export type FamilyDirectoryEntry = {
  householdId: string;
  householdName: string;
  status: HouseholdStatus;
  city: string | null;
  region: string | null;
  adultCount: number;
  studentCount: number;
};
