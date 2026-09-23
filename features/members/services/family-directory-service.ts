import "server-only";

import { createClient } from "@/lib/supabase/server";
import { familyWorkspaceSchema } from "@/features/members/schemas/family-workspace-schema";

import type { FamilyDirectoryEntry } from "@/features/members/types/family-directory";
import type { FamilyWorkspace } from "@/features/members/types/family-workspace";
import type {
  HouseholdStatus,
} from "@/lib/supabase/database.types";
import type { ParentAccountLinkCandidate } from "@/features/members/types/family-management";

type UntypedRpcResult = Promise<{
  data: unknown;
  error: { code?: string; message: string } | null;
}>;
type UntypedRpcClient = {
  rpc(name: string, args: Record<string, unknown>): UntypedRpcResult;
};

export async function listAccessibleFamilies(
  search: string | null,
): Promise<
  | { success: true; families: FamilyDirectoryEntry[] }
  | { success: false }
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_accessible_families", {
      p_search: search,
    });

    if (error) {
      return { success: false };
    }

    return {
      success: true,
      families: (data ?? []).map((family) => ({
        householdId: family.household_id,
        householdName: family.household_name,
        status: family.status,
        city: family.city,
        region: family.region,
        adultCount: Number(family.adult_count),
        studentCount: Number(family.student_count),
      })),
    };
  } catch {
    return { success: false };
  }
}

export async function updateFamilyDetails(input: {
  householdId: string;
  name: string;
  status: HouseholdStatus;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_family_details", {
    p_household_id: input.householdId,
    p_name: input.name,
    p_status: input.status,
    p_address_line_1: input.addressLine1,
    p_address_line_2: input.addressLine2,
    p_city: input.city,
    p_region: input.region,
    p_postal_code: input.postalCode,
    p_country_code: input.countryCode,
  });

  return { success: !error };
}

export async function updateFamilyAdult(input: {
  householdId: string;
  personId: string;
  firstName: string;
  preferredName: string | null;
  lastName: string;
  email: string | null;
  phone: string | null;
  relationshipLabel: string;
  isResponsibleAdult: boolean;
  isPrimaryContact: boolean;
  receiveEmail: boolean;
  receiveSms: boolean;
  receiveEmergencyNotifications: boolean;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_family_adult", {
    p_household_id: input.householdId,
    p_person_id: input.personId,
    p_first_name: input.firstName,
    p_preferred_name: input.preferredName,
    p_last_name: input.lastName,
    p_email: input.email,
    p_phone: input.phone,
    p_relationship_label: input.relationshipLabel,
    p_is_responsible_adult: input.isResponsibleAdult,
    p_is_primary_contact: input.isPrimaryContact,
    p_receive_email: input.receiveEmail,
    p_receive_sms: input.receiveSms,
    p_receive_emergency_notifications: input.receiveEmergencyNotifications,
  });

  return { success: !error };
}

export async function createFamily(input: {
  name: string;
  status: HouseholdStatus;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  adultFirstName: string;
  adultPreferredName: string | null;
  adultLastName: string;
  adultEmail: string | null;
  adultPhone: string | null;
  relationshipLabel: string;
  receiveEmail: boolean;
  receiveSms: boolean;
  receiveEmergencyNotifications: boolean;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_family", {
    p_name: input.name,
    p_status: input.status,
    p_address_line_1: input.addressLine1,
    p_address_line_2: input.addressLine2,
    p_city: input.city,
    p_region: input.region,
    p_postal_code: input.postalCode,
    p_country_code: input.countryCode,
    p_adult_first_name: input.adultFirstName,
    p_adult_preferred_name: input.adultPreferredName,
    p_adult_last_name: input.adultLastName,
    p_adult_email: input.adultEmail,
    p_adult_phone: input.adultPhone,
    p_relationship_label: input.relationshipLabel,
    p_receive_email: input.receiveEmail,
    p_receive_sms: input.receiveSms,
    p_receive_emergency_notifications: input.receiveEmergencyNotifications,
  });
  return error || !data
    ? { success: false as const }
    : { success: true as const, householdId: data };
}

export async function addFamilyAdult(input: {
  householdId: string;
  firstName: string;
  preferredName: string | null;
  lastName: string;
  email: string | null;
  phone: string | null;
  relationshipLabel: string;
  isResponsibleAdult: boolean;
  isPrimaryContact: boolean;
  receiveEmail: boolean;
  receiveSms: boolean;
  receiveEmergencyNotifications: boolean;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_family_adult", {
    p_household_id: input.householdId,
    p_first_name: input.firstName,
    p_preferred_name: input.preferredName,
    p_last_name: input.lastName,
    p_email: input.email,
    p_phone: input.phone,
    p_relationship_label: input.relationshipLabel,
    p_is_responsible_adult: input.isResponsibleAdult,
    p_is_primary_contact: input.isPrimaryContact,
    p_receive_email: input.receiveEmail,
    p_receive_sms: input.receiveSms,
    p_receive_emergency_notifications: input.receiveEmergencyNotifications,
  });
  return { success: !error };
}

export async function getFamilyWorkspace(
  householdId: string,
): Promise<
  | { success: true; family: FamilyWorkspace }
  | { success: false; reason: "denied" | "unavailable" }
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_family_workspace", {
      p_household_id: householdId,
    });

    if (error) {
      return {
        success: false,
        reason: error.code === "42501" || error.code === "22023"
          ? "denied"
          : "unavailable",
      };
    }

    const parsed = familyWorkspaceSchema.safeParse(data);

    if (!parsed.success) {
      return { success: false, reason: "unavailable" };
    }

    return { success: true, family: parsed.data };
  } catch {
    return { success: false, reason: "unavailable" };
  }
}

export async function listParentAccountLinkCandidates(
  personId: string,
): Promise<ParentAccountLinkCandidate[]> {
  const client = await createClient() as unknown as UntypedRpcClient;
  const { data, error } = await client.rpc("list_parent_account_link_candidates", {
    p_person_id: personId,
  });
  if (error || !Array.isArray(data)) return [];

  return data.map((value) => {
    const row = value as Record<string, unknown>;
    return {
      profileId: String(row.profile_id),
      accountEmail: String(row.account_email),
      displayName: String(row.display_name),
      accountRole: "parent",
      accountStatus: row.account_status as ParentAccountLinkCandidate["accountStatus"],
      linkedPersonId: row.linked_person_id ? String(row.linked_person_id) : null,
      linkedPersonName: row.linked_person_name ? String(row.linked_person_name) : null,
      linkedHouseholds: Array.isArray(row.linked_households)
        ? row.linked_households.map(String)
        : [],
      emailMatches: row.email_matches === true,
      matchingActivePeopleCount: Number(row.matching_active_people_count),
    };
  });
}

export async function linkParentAccountToPerson(input: {
  profileId: string;
  personId: string;
  confirmRelink: boolean;
  reason: string;
}) {
  const client = await createClient() as unknown as UntypedRpcClient;
  const { error } = await client.rpc("link_parent_account_to_person", {
    p_profile_id: input.profileId,
    p_person_id: input.personId,
    p_confirm_relink: input.confirmRelink,
    p_reason: input.reason,
  });
  return { success: !error, code: error?.code };
}
