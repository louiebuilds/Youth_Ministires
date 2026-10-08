import type { CommunicationChannel } from "@/lib/supabase/database.types";

export type MinistrySettings = {
  contactEmail: string | null;
  contactPhone: string | null;
  defaultCampusName: string | null;
  defaultCommunicationChannel: CommunicationChannel;
  defaultEventAddress: string | null;
  familyCheckinInstructions: string;
  ministryDisplayName: string;
  timezone: "America/Chicago";
  updatedAt: string;
  updatedByProfileId: string | null;
};

export type MinistrySettingsActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};
