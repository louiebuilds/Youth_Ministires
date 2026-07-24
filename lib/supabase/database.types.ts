export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AccountRole =
  | "platform_administrator"
  | "youth_pastor"
  | "staff_member"
  | "volunteer"
  | "parent";

export type AccountStatus =
  | "invited"
  | "active"
  | "suspended"
  | "disabled"
  | "archived";

export type PersonStatus = "active" | "inactive" | "archived";

export type HouseholdStatus = "prospect" | "active" | "inactive" | "archived";

export type StudentStatus =
  | "prospective"
  | "registered"
  | "active"
  | "inactive"
  | "archived";

export type EventStatus =
  | "draft"
  | "published"
  | "active"
  | "completed"
  | "archived";

export type VolunteerAssignmentStatus =
  | "assigned"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "completed";

export type AuditResult = "success" | "failure" | "denied";
export type AuditSource = "web" | "api" | "system" | "migration";

type TableDefinition<
  Row,
  RequiredInsertKeys extends keyof Row,
  Insert = Pick<Row, RequiredInsertKeys> &
    Partial<Omit<Row, RequiredInsertKeys>>,
> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};

export type PersonRow = {
  id: string;
  first_name: string;
  preferred_name: string | null;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: PersonStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  person_id: string | null;
  primary_role: AccountRole;
  status: AccountStatus;
  display_name: string;
  created_at: string;
  updated_at: string;
};

export type HouseholdRow = {
  id: string;
  name: string;
  status: HouseholdStatus;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country_code: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HouseholdMembershipRow = {
  id: string;
  household_id: string;
  person_id: string;
  relationship_label: string;
  is_responsible_adult: boolean;
  is_primary_contact: boolean;
  receive_email: boolean;
  receive_sms: boolean;
  receive_emergency_notifications: boolean;
  created_at: string;
  updated_at: string;
};

export type StudentRow = {
  id: string;
  person_id: string;
  primary_household_id: string;
  birth_date: string;
  grade: string;
  status: StudentStatus;
  medical_summary: string | null;
  allergy_summary: string | null;
  dietary_summary: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentRelationshipRow = {
  id: string;
  student_id: string;
  person_id: string;
  relationship_type: string;
  is_legal_guardian: boolean;
  is_emergency_contact: boolean;
  is_authorized_pickup: boolean;
  may_sign_permission_forms: boolean;
  may_view_student_information: boolean;
  receive_email: boolean;
  receive_sms: boolean;
  created_at: string;
  updated_at: string;
};

export type EventRow = {
  id: string;
  name: string;
  event_type: string;
  status: EventStatus;
  starts_at: string;
  ends_at: string;
  timezone: string;
  capacity: number | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EventVolunteerAssignmentRow = {
  id: string;
  event_id: string;
  profile_id: string;
  assignment_role: string;
  status: VolunteerAssignmentStatus;
  starts_at: string | null;
  ends_at: string | null;
  assigned_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditEventRow = {
  id: number;
  event_id: string;
  occurred_at: string;
  actor_profile_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  result: AuditResult;
  source: AuditSource;
  request_id: string | null;
  metadata: Json;
};

export type MemberTagRow = {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
};

export type MemberTagAssignmentRow = {
  id: string;
  person_id: string;
  tag_id: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      people: TableDefinition<PersonRow, "first_name" | "last_name">;
      profiles: TableDefinition<ProfileRow, "id" | "display_name">;
      households: TableDefinition<HouseholdRow, "name">;
      household_memberships: TableDefinition<
        HouseholdMembershipRow,
        "household_id" | "person_id" | "relationship_label"
      >;
      students: TableDefinition<
        StudentRow,
        "person_id" | "primary_household_id" | "birth_date" | "grade"
      >;
      student_relationships: TableDefinition<
        StudentRelationshipRow,
        "student_id" | "person_id" | "relationship_type"
      >;
      events: TableDefinition<
        EventRow,
        "name" | "event_type" | "starts_at" | "ends_at"
      >;
      event_volunteer_assignments: TableDefinition<
        EventVolunteerAssignmentRow,
        "event_id" | "profile_id" | "assignment_role"
      >;
      audit_events: TableDefinition<
        AuditEventRow,
        "action" | "entity_type" | "result" | "source"
      >;
      member_tags: TableDefinition<MemberTagRow, "name">;
      member_tag_assignments: TableDefinition<
        MemberTagAssignmentRow,
        "person_id" | "tag_id"
      >;
    };
    Views: Record<never, never>;
    Functions: {
      add_family_adult: {
        Args: {
          p_email: string | null;
          p_first_name: string;
          p_household_id: string;
          p_is_primary_contact: boolean;
          p_is_responsible_adult: boolean;
          p_last_name: string;
          p_phone: string | null;
          p_preferred_name: string | null;
          p_receive_email: boolean;
          p_receive_emergency_notifications: boolean;
          p_receive_sms: boolean;
          p_relationship_label: string;
        };
        Returns: string;
      };
      admin_update_account: {
        Args: {
          p_display_name: string;
          p_primary_role: AccountRole;
          p_profile_id: string;
          p_status: AccountStatus;
        };
        Returns: undefined;
      };
      create_child: {
        Args: {
          p_allergy_summary: string | null;
          p_birth_date: string;
          p_dietary_summary: string | null;
          p_first_name: string;
          p_grade: string;
          p_guardian_person_id: string;
          p_household_id: string;
          p_last_name: string;
          p_medical_summary: string | null;
          p_preferred_name: string | null;
          p_status: StudentStatus;
        };
        Returns: string;
      };
      create_family: {
        Args: {
          p_address_line_1: string | null;
          p_address_line_2: string | null;
          p_adult_email: string | null;
          p_adult_first_name: string;
          p_adult_last_name: string;
          p_adult_phone: string | null;
          p_adult_preferred_name: string | null;
          p_city: string | null;
          p_country_code: string;
          p_name: string;
          p_postal_code: string | null;
          p_receive_email: boolean;
          p_receive_emergency_notifications: boolean;
          p_receive_sms: boolean;
          p_region: string | null;
          p_relationship_label: string;
          p_status: HouseholdStatus;
        };
        Returns: string;
      };
      create_member_tag: {
        Args: {
          p_color: string;
          p_name: string;
        };
        Returns: string;
      };
      get_family_workspace: {
        Args: {
          p_household_id: string;
        };
        Returns: Json;
      };
      get_child_workspace: {
        Args: {
          p_student_id: string;
        };
        Returns: Json;
      };
      list_managed_accounts: {
        Args: {
          p_search?: string | null;
        };
        Returns: {
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          primary_role: AccountRole;
          status: AccountStatus;
          updated_at: string;
        }[];
      };
      list_accessible_families: {
        Args: {
          p_search?: string | null;
        };
        Returns: {
          adult_count: number;
          city: string | null;
          household_id: string;
          household_name: string;
          region: string | null;
          status: HouseholdStatus;
          student_count: number;
        }[];
      };
      list_member_directory: {
        Args: {
          p_grade?: string | null;
          p_search?: string | null;
          p_status?: StudentStatus | null;
          p_tag_id?: string | null;
        };
        Returns: {
          display_name: string;
          grade: string;
          household_id: string;
          household_name: string;
          status: StudentStatus;
          student_id: string;
          tags: Json;
        }[];
      };
      set_child_tags: {
        Args: {
          p_student_id: string;
          p_tag_ids: string[];
        };
        Returns: undefined;
      };
      update_own_profile: {
        Args: {
          p_display_name: string;
        };
        Returns: undefined;
      };
      update_family_adult: {
        Args: {
          p_email: string | null;
          p_first_name: string;
          p_household_id: string;
          p_is_primary_contact: boolean;
          p_is_responsible_adult: boolean;
          p_last_name: string;
          p_person_id: string;
          p_phone: string | null;
          p_preferred_name: string | null;
          p_receive_email: boolean;
          p_receive_emergency_notifications: boolean;
          p_receive_sms: boolean;
          p_relationship_label: string;
        };
        Returns: undefined;
      };
      update_family_details: {
        Args: {
          p_address_line_1: string | null;
          p_address_line_2: string | null;
          p_city: string | null;
          p_country_code: string;
          p_household_id: string;
          p_name: string;
          p_postal_code: string | null;
          p_region: string | null;
          p_status: HouseholdStatus;
        };
        Returns: undefined;
      };
      update_child_details: {
        Args: {
          p_allergy_summary: string | null;
          p_birth_date: string;
          p_dietary_summary: string | null;
          p_first_name: string;
          p_grade: string;
          p_last_name: string;
          p_medical_summary: string | null;
          p_preferred_name: string | null;
          p_status: StudentStatus;
          p_student_id: string;
        };
        Returns: undefined;
      };
      update_child_relationship: {
        Args: {
          p_is_authorized_pickup: boolean;
          p_is_emergency_contact: boolean;
          p_is_legal_guardian: boolean;
          p_may_sign_permission_forms: boolean;
          p_may_view_student_information: boolean;
          p_person_id: string;
          p_receive_email: boolean;
          p_receive_sms: boolean;
          p_relationship_type: string;
          p_student_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      account_role: AccountRole;
      account_status: AccountStatus;
      person_status: PersonStatus;
      household_status: HouseholdStatus;
      student_status: StudentStatus;
      event_status: EventStatus;
      volunteer_assignment_status: VolunteerAssignmentStatus;
      audit_result: AuditResult;
      audit_source: AuditSource;
    };
    CompositeTypes: Record<never, never>;
  };
};
