import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import type { MinistrySettings } from "@/features/administration/types/ministry-settings";

type MinistrySettingsFailure = {
  success: false;
  reason: "denied" | "invalid" | "unavailable";
};

export async function getDefaultCommunicationChannel(): Promise<
  MinistrySettings["defaultCommunicationChannel"]
> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ministry_settings")
      .select("default_communication_channel")
      .eq("id", 1)
      .maybeSingle();

    return error || !data?.default_communication_channel
      ? "in_app"
      : data.default_communication_channel;
  } catch {
    return "in_app";
  }
}

export type MinistryContact = {
  email: string | null;
  phone: string | null;
};

export async function getMinistryContact(): Promise<MinistryContact | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ministry_settings")
      .select("contact_email, contact_phone")
      .eq("id", 1)
      .maybeSingle();

    return error || !data
      ? null
      : {
          email: data.contact_email,
          phone: data.contact_phone,
        };
  } catch {
    return null;
  }
}

export const DEFAULT_MINISTRY_DISPLAY_NAME = "Youth Ministries Platform";

export async function getMinistryDisplayName() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ministry_settings")
      .select("ministry_display_name")
      .eq("id", 1)
      .maybeSingle();

    return error || !data?.ministry_display_name
      ? DEFAULT_MINISTRY_DISPLAY_NAME
      : data.ministry_display_name;
  } catch {
    return DEFAULT_MINISTRY_DISPLAY_NAME;
  }
}

export const DEFAULT_FAMILY_CHECKIN_INSTRUCTIONS =
  "This QR code identifies your household for check-in. Staff confirms attendees, and the QR code does not authorize pickup or release.";

export async function getFamilyCheckinInstructions() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ministry_settings")
      .select("family_checkin_instructions")
      .eq("id", 1)
      .maybeSingle();

    return error || !data?.family_checkin_instructions
      ? DEFAULT_FAMILY_CHECKIN_INSTRUCTIONS
      : data.family_checkin_instructions;
  } catch {
    return DEFAULT_FAMILY_CHECKIN_INSTRUCTIONS;
  }
}

export type NewEventDefaults = {
  address: string | null;
  campus: string | null;
  timezone: string;
};

const fallbackNewEventDefaults: NewEventDefaults = {
  address: null,
  campus: null,
  timezone: "America/Chicago",
};

export async function getNewEventDefaults(): Promise<NewEventDefaults> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ministry_settings")
      .select("timezone, default_campus_name, default_event_address")
      .eq("id", 1)
      .maybeSingle();

    return error || !data
      ? fallbackNewEventDefaults
      : {
          address: data.default_event_address,
          campus: data.default_campus_name,
          timezone: data.timezone || "America/Chicago",
        };
  } catch {
    return fallbackNewEventDefaults;
  }
}

export async function getMinistrySettings(): Promise<
  | { success: true; settings: MinistrySettings }
  | MinistrySettingsFailure
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_ministry_settings");
    if (error || !data?.[0]) {
      return {
        success: false,
        reason: error?.code === "42501" ? "denied" : "unavailable",
      };
    }
    const settings = data[0];
    return {
      success: true,
      settings: {
        contactEmail: settings.contact_email,
        contactPhone: settings.contact_phone,
        defaultCampusName: settings.default_campus_name,
        defaultCommunicationChannel: settings.default_communication_channel,
        defaultEventAddress: settings.default_event_address,
        familyCheckinInstructions: settings.family_checkin_instructions,
        ministryDisplayName: settings.ministry_display_name,
        timezone: settings.timezone as "America/Chicago",
        updatedAt: settings.updated_at,
        updatedByProfileId: settings.updated_by_profile_id,
      },
    };
  } catch {
    return { success: false, reason: "unavailable" };
  }
}

export async function updateMinistrySettings(
  settings: Omit<MinistrySettings, "updatedAt" | "updatedByProfileId">,
): Promise<{ success: true } | MinistrySettingsFailure> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_ministry_settings", {
      p_contact_email: settings.contactEmail,
      p_contact_phone: settings.contactPhone,
      p_default_campus_name: settings.defaultCampusName,
      p_default_communication_channel: settings.defaultCommunicationChannel,
      p_default_event_address: settings.defaultEventAddress,
      p_family_checkin_instructions: settings.familyCheckinInstructions,
      p_ministry_display_name: settings.ministryDisplayName,
      p_timezone: settings.timezone,
    });
    if (!error) return { success: true };
    return {
      success: false,
      reason:
        error.code === "42501"
          ? "denied"
          : error.code === "22023"
            ? "invalid"
            : "unavailable",
    };
  } catch {
    return { success: false, reason: "unavailable" };
  }
}
