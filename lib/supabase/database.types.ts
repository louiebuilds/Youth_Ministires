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

export type CheckInStatus =
  | "expected"
  | "checked_in"
  | "checked_out"
  | "exception";

export type VisitorCheckInStatus = "checked_in" | "checked_out";

export type VolunteerAssignmentStatus =
  | "assigned"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "completed";

export type BackgroundCheckStatus =
  | "not_required"
  | "pending"
  | "cleared"
  | "review_required"
  | "expired";

export type VolunteerCertificationStatus = "active" | "expired" | "revoked";
export type VolunteerSkillLevel =
  | "interested"
  | "beginner"
  | "proficient"
  | "advanced";

export type AttendanceStatus = "pending" | "present" | "absent" | "excused";

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

export type VolunteerProfileRow = {
  profile_id: string;
  ministry_title: string | null;
  background_check_status: BackgroundCheckStatus;
  background_check_completed_at: string | null;
  background_check_expires_at: string | null;
  background_check_reference: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type VolunteerCertificationRow = {
  id: string;
  profile_id: string;
  name: string;
  issuer: string | null;
  issued_at: string | null;
  expires_at: string | null;
  status: VolunteerCertificationStatus;
  reference: string | null;
  created_at: string;
  updated_at: string;
};

export type VolunteerSkillRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type VolunteerSkillAssignmentRow = {
  id: string;
  profile_id: string;
  skill_id: string;
  skill_level: VolunteerSkillLevel;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type VolunteerAvailabilityRow = {
  id: string;
  profile_id: string;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  timezone: string;
  effective_from: string;
  effective_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AttendanceSessionRow = {
  id: string;
  event_id: string;
  session_date: string;
  class_name: string;
  starts_at: string | null;
  ends_at: string | null;
  finalized_at: string | null;
  finalized_by_profile_id: string | null;
  created_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AttendanceRecordRow = {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  notes: string | null;
  recorded_by_profile_id: string | null;
  corrected_at: string | null;
  corrected_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
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
      volunteer_profiles: TableDefinition<VolunteerProfileRow, "profile_id">;
      volunteer_certifications: TableDefinition<
        VolunteerCertificationRow,
        "profile_id" | "name"
      >;
      volunteer_skills: TableDefinition<VolunteerSkillRow, "name">;
      volunteer_skill_assignments: TableDefinition<
        VolunteerSkillAssignmentRow,
        "profile_id" | "skill_id"
      >;
      volunteer_availability: TableDefinition<
        VolunteerAvailabilityRow,
        "profile_id" | "day_of_week" | "starts_at" | "ends_at"
      >;
      attendance_sessions: TableDefinition<
        AttendanceSessionRow,
        "event_id" | "session_date" | "class_name"
      >;
      attendance_records: TableDefinition<
        AttendanceRecordRow,
        "session_id" | "student_id"
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
      list_volunteer_directory: {
        Args: { p_search?: string | null };
        Returns: {
          profile_id: string;
          display_name: string;
          primary_role: AccountRole;
          ministry_title: string | null;
          background_check_status: BackgroundCheckStatus;
          background_check_expires_at: string | null;
          is_active: boolean;
          skills: Json;
        }[];
      };
      list_volunteer_candidates: {
        Args: Record<never, never>;
        Returns: {
          profile_id: string;
          display_name: string;
          primary_role: AccountRole;
        }[];
      };
      get_volunteer_workspace: {
        Args: { p_profile_id: string };
        Returns: Json;
      };
      upsert_volunteer_profile: {
        Args: {
          p_profile_id: string;
          p_ministry_title: string | null;
          p_background_check_status: BackgroundCheckStatus;
          p_background_check_completed_at: string | null;
          p_background_check_expires_at: string | null;
          p_background_check_reference: string | null;
          p_is_active: boolean;
        };
        Returns: undefined;
      };
      save_volunteer_certification: {
        Args: {
          p_id: string | null;
          p_profile_id: string;
          p_name: string;
          p_issuer: string | null;
          p_issued_at: string | null;
          p_expires_at: string | null;
          p_status: VolunteerCertificationStatus;
          p_reference: string | null;
        };
        Returns: string;
      };
      create_volunteer_skill: {
        Args: { p_name: string; p_description: string | null };
        Returns: string;
      };
      save_volunteer_skill_assignment: {
        Args: {
          p_profile_id: string;
          p_skill_id: string;
          p_skill_level: VolunteerSkillLevel;
          p_notes: string | null;
        };
        Returns: undefined;
      };
      save_volunteer_availability: {
        Args: {
          p_id: string | null;
          p_profile_id: string;
          p_day_of_week: number;
          p_starts_at: string;
          p_ends_at: string;
          p_timezone: string;
          p_effective_from: string;
          p_effective_until: string | null;
          p_notes: string | null;
        };
        Returns: string;
      };
      list_volunteer_assignments: {
        Args: { p_profile_id: string };
        Returns: {
          assignment_id: string;
          event_id: string;
          event_name: string;
          event_status: EventStatus;
          event_starts_at: string;
          event_ends_at: string;
          event_timezone: string;
          assignment_role: string;
          assignment_status: VolunteerAssignmentStatus;
          assignment_starts_at: string | null;
          assignment_ends_at: string | null;
        }[];
      };
      list_schedulable_events: {
        Args: Record<never, never>;
        Returns: {
          event_id: string;
          event_name: string;
          event_status: EventStatus;
          starts_at: string;
          ends_at: string;
          timezone: string;
        }[];
      };
      schedule_volunteer: {
        Args: {
          p_event_id: string;
          p_profile_id: string;
          p_assignment_role: string;
          p_starts_at: string | null;
          p_ends_at: string | null;
        };
        Returns: string;
      };
      set_volunteer_assignment_status: {
        Args: {
          p_assignment_id: string;
          p_status: VolunteerAssignmentStatus;
        };
        Returns: undefined;
      };
      list_attendance_events: {
        Args: Record<never, never>;
        Returns: {
          event_id: string;
          event_name: string;
          event_status: EventStatus;
          starts_at: string;
          ends_at: string;
          timezone: string;
        }[];
      };
      list_attendance_sessions: {
        Args: Record<never, never>;
        Returns: {
          session_id: string;
          event_id: string;
          event_name: string;
          session_date: string;
          class_name: string;
          starts_at: string | null;
          ends_at: string | null;
          finalized_at: string | null;
          present_count: number;
          absent_count: number;
          excused_count: number;
          pending_count: number;
        }[];
      };
      list_attendance_report_sessions: {
        Args: { p_from_date: string; p_to_date: string };
        Returns: {
          session_id: string;
          session_date: string;
          event_name: string;
          class_name: string;
          finalized_at: string | null;
          present_count: number;
          absent_count: number;
          excused_count: number;
          pending_count: number;
        }[];
      };
      list_checkin_report_events: {
        Args: { p_from_date: string; p_to_date: string };
        Returns: {
          event_id: string;
          event_name: string;
          starts_at: string;
          checked_in_count: number;
          checked_out_count: number;
          exception_count: number;
          visitor_count: number;
          visitor_checked_out_count: number;
        }[];
      };
      create_attendance_session: {
        Args: {
          p_event_id: string;
          p_session_date: string;
          p_class_name: string;
          p_starts_at: string | null;
          p_ends_at: string | null;
        };
        Returns: string;
      };
      list_attendance_roster: {
        Args: { p_session_id: string; p_search?: string | null };
        Returns: {
          student_id: string;
          display_name: string;
          household_name: string;
          grade: string;
          student_status: StudentStatus;
          attendance_record_id: string | null;
          attendance_status: AttendanceStatus;
          notes: string | null;
          corrected_at: string | null;
        }[];
      };
      save_attendance_record: {
        Args: {
          p_session_id: string;
          p_student_id: string;
          p_status: AttendanceStatus;
          p_notes: string | null;
        };
        Returns: string;
      };
      finalize_attendance_session: {
        Args: { p_session_id: string };
        Returns: undefined;
      };
      list_checkin_events: {
        Args: Record<never, never>;
        Returns: {
          event_id: string;
          event_name: string;
          starts_at: string;
          ends_at: string;
          timezone: string;
        }[];
      };
      search_checkin_households: {
        Args: { p_event_id: string; p_search: string };
        Returns: {
          household_id: string;
          household_name: string;
          student_count: number;
        }[];
      };
      get_checkin_household: {
        Args: { p_event_id: string; p_household_id: string };
        Returns: Json;
      };
      check_in_student: {
        Args: { p_event_id: string; p_student_id: string };
        Returns: string;
      };
      check_out_student: {
        Args: {
          p_event_id: string;
          p_student_id: string;
          p_pickup_person_id: string | null;
          p_override_reason: string | null;
        };
        Returns: undefined;
      };
      correct_student_check_in: {
        Args: {
          p_event_id: string;
          p_student_id: string;
          p_reason: string;
        };
        Returns: undefined;
      };
      list_emergency_roster: {
        Args: { p_event_id: string };
        Returns: {
          check_in_id: string;
          student_id: string;
          display_name: string;
          household_name: string;
          checked_in_at: string;
          has_care_alert: boolean;
          emergency_contact: string | null;
        }[];
      };
      check_in_visitor: {
        Args: {
          p_event_id: string;
          p_first_name: string;
          p_last_name: string;
          p_grade: string | null;
          p_guardian_name: string;
          p_guardian_contact: string;
        };
        Returns: string;
      };
      check_out_visitor: {
        Args: { p_visitor_id: string };
        Returns: undefined;
      };
      list_checked_in_visitors: {
        Args: { p_event_id: string };
        Returns: {
          visitor_id: string;
          display_name: string;
          grade: string | null;
          guardian_name: string;
          guardian_contact: string;
          checked_in_at: string;
        }[];
      };
      issue_family_checkin_token: {
        Args: { p_household_id: string };
        Returns: string;
      };
      resolve_family_checkin_token: {
        Args: { p_event_id: string; p_token: string };
        Returns: string;
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
      list_available_child_relationship_adults: {
        Args: { p_student_id: string };
        Returns: {
          person_id: string;
          display_name: string;
          household_relationship: string;
        }[];
      };
      add_child_relationship: {
        Args: {
          p_student_id: string;
          p_person_id: string;
          p_relationship_type: string;
          p_is_legal_guardian: boolean;
          p_is_emergency_contact: boolean;
          p_is_authorized_pickup: boolean;
          p_may_sign_permission_forms: boolean;
          p_may_view_student_information: boolean;
          p_receive_email: boolean;
          p_receive_sms: boolean;
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
      background_check_status: BackgroundCheckStatus;
      volunteer_certification_status: VolunteerCertificationStatus;
      volunteer_skill_level: VolunteerSkillLevel;
      attendance_status: AttendanceStatus;
      check_in_status: CheckInStatus;
      visitor_check_in_status: VisitorCheckInStatus;
      audit_result: AuditResult;
      audit_source: AuditSource;
    };
    CompositeTypes: Record<never, never>;
  };
};
