export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          archived_at: string | null
          audience_type: Database["public"]["Enums"]["communication_audience_type"]
          created_at: string
          created_by_profile_id: string
          expires_at: string | null
          id: string
          message_body: string
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          audience_type: Database["public"]["Enums"]["communication_audience_type"]
          created_at?: string
          created_by_profile_id: string
          expires_at?: string | null
          id?: string
          message_body: string
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          audience_type?: Database["public"]["Enums"]["communication_audience_type"]
          created_at?: string
          created_by_profile_id?: string
          expires_at?: string | null
          id?: string
          message_body?: string
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          corrected_at: string | null
          corrected_by_profile_id: string | null
          created_at: string
          id: string
          notes: string | null
          recorded_by_profile_id: string | null
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          corrected_at?: string | null
          corrected_by_profile_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by_profile_id?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          corrected_at?: string | null
          corrected_by_profile_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by_profile_id?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_corrected_by_profile_id_fkey"
            columns: ["corrected_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_recorded_by_profile_id_fkey"
            columns: ["recorded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          class_name: string
          created_at: string
          created_by_profile_id: string | null
          ends_at: string | null
          event_id: string
          finalized_at: string | null
          finalized_by_profile_id: string | null
          id: string
          session_date: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          class_name: string
          created_at?: string
          created_by_profile_id?: string | null
          ends_at?: string | null
          event_id: string
          finalized_at?: string | null
          finalized_by_profile_id?: string | null
          id?: string
          session_date: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          class_name?: string
          created_at?: string
          created_by_profile_id?: string | null
          ends_at?: string | null
          event_id?: string
          finalized_at?: string | null
          finalized_by_profile_id?: string | null
          id?: string
          session_date?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_finalized_by_profile_id_fkey"
            columns: ["finalized_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_profile_id: string | null
          entity_id: string | null
          entity_type: string
          event_id: string
          id: number
          metadata: Json
          occurred_at: string
          request_id: string | null
          result: Database["public"]["Enums"]["audit_result"]
          source: Database["public"]["Enums"]["audit_source"]
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          entity_id?: string | null
          entity_type: string
          event_id?: string
          id?: never
          metadata?: Json
          occurred_at?: string
          request_id?: string | null
          result: Database["public"]["Enums"]["audit_result"]
          source: Database["public"]["Enums"]["audit_source"]
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          entity_id?: string | null
          entity_type?: string
          event_id?: string
          id?: never
          metadata?: Json
          occurred_at?: string
          request_id?: string | null
          result?: Database["public"]["Enums"]["audit_result"]
          source?: Database["public"]["Enums"]["audit_source"]
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      care_categories: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by_profile_id: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_categories_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      care_follow_ups: {
        Row: {
          archived_at: string | null
          assigned_to_profile_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_profile_id: string | null
          care_note_id: string | null
          completed_at: string | null
          completed_by_profile_id: string | null
          completion_notes: string | null
          created_at: string
          created_by_profile_id: string
          due_at: string | null
          id: string
          instructions: string | null
          person_id: string
          prayer_request_id: string | null
          priority: Database["public"]["Enums"]["care_follow_up_priority"]
          status: Database["public"]["Enums"]["care_follow_up_status"]
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_to_profile_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          care_note_id?: string | null
          completed_at?: string | null
          completed_by_profile_id?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by_profile_id: string
          due_at?: string | null
          id?: string
          instructions?: string | null
          person_id: string
          prayer_request_id?: string | null
          priority?: Database["public"]["Enums"]["care_follow_up_priority"]
          status?: Database["public"]["Enums"]["care_follow_up_status"]
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_to_profile_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          care_note_id?: string | null
          completed_at?: string | null
          completed_by_profile_id?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by_profile_id?: string
          due_at?: string | null
          id?: string
          instructions?: string | null
          person_id?: string
          prayer_request_id?: string | null
          priority?: Database["public"]["Enums"]["care_follow_up_priority"]
          status?: Database["public"]["Enums"]["care_follow_up_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_follow_ups_assigned_to_profile_id_fkey"
            columns: ["assigned_to_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_follow_ups_cancelled_by_profile_id_fkey"
            columns: ["cancelled_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_follow_ups_care_note_id_fkey"
            columns: ["care_note_id"]
            isOneToOne: false
            referencedRelation: "care_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_follow_ups_completed_by_profile_id_fkey"
            columns: ["completed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_follow_ups_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_follow_ups_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_follow_ups_prayer_request_id_fkey"
            columns: ["prayer_request_id"]
            isOneToOne: false
            referencedRelation: "prayer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      care_notes: {
        Row: {
          archived_at: string | null
          assigned_to_profile_id: string | null
          category_id: string | null
          created_at: string
          created_by_profile_id: string
          id: string
          note_content: string
          occurred_at: string
          person_id: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_to_profile_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by_profile_id: string
          id?: string
          note_content: string
          occurred_at?: string
          person_id: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_to_profile_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by_profile_id?: string
          id?: string
          note_content?: string
          occurred_at?: string
          person_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_notes_assigned_to_profile_id_fkey"
            columns: ["assigned_to_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_notes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "care_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_notes_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_notes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      check_in_records: {
        Row: {
          checked_in_at: string | null
          checked_in_by_profile_id: string | null
          checked_out_at: string | null
          checked_out_by_profile_id: string | null
          created_at: string
          event_id: string
          exception_reason: string | null
          household_id: string
          id: string
          override_by_profile_id: string | null
          pickup_person_id: string | null
          status: Database["public"]["Enums"]["check_in_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by_profile_id?: string | null
          checked_out_at?: string | null
          checked_out_by_profile_id?: string | null
          created_at?: string
          event_id: string
          exception_reason?: string | null
          household_id: string
          id?: string
          override_by_profile_id?: string | null
          pickup_person_id?: string | null
          status?: Database["public"]["Enums"]["check_in_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by_profile_id?: string | null
          checked_out_at?: string | null
          checked_out_by_profile_id?: string | null
          created_at?: string
          event_id?: string
          exception_reason?: string | null
          household_id?: string
          id?: string
          override_by_profile_id?: string | null
          pickup_person_id?: string | null
          status?: Database["public"]["Enums"]["check_in_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_in_records_checked_in_by_profile_id_fkey"
            columns: ["checked_in_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_records_checked_out_by_profile_id_fkey"
            columns: ["checked_out_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_records_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_records_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_records_override_by_profile_id_fkey"
            columns: ["override_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_records_pickup_person_id_fkey"
            columns: ["pickup_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_deliveries: {
        Row: {
          attempted_at: string | null
          communication_recipient_id: string
          created_at: string
          delivered_at: string | null
          failure_reason: string | null
          id: string
          provider_reference: string | null
          status: Database["public"]["Enums"]["communication_delivery_status"]
          updated_at: string
        }
        Insert: {
          attempted_at?: string | null
          communication_recipient_id: string
          created_at?: string
          delivered_at?: string | null
          failure_reason?: string | null
          id?: string
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["communication_delivery_status"]
          updated_at?: string
        }
        Update: {
          attempted_at?: string | null
          communication_recipient_id?: string
          created_at?: string
          delivered_at?: string | null
          failure_reason?: string | null
          id?: string
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["communication_delivery_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_deliveries_communication_recipient_id_fkey"
            columns: ["communication_recipient_id"]
            isOneToOne: false
            referencedRelation: "communication_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_recipients: {
        Row: {
          communication_id: string
          created_at: string
          destination_masked: string | null
          display_name: string
          household_id: string | null
          id: string
          preference_authorized: boolean
          recipient_profile_id: string | null
          suppression_reason: string | null
        }
        Insert: {
          communication_id: string
          created_at?: string
          destination_masked?: string | null
          display_name: string
          household_id?: string | null
          id?: string
          preference_authorized: boolean
          recipient_profile_id?: string | null
          suppression_reason?: string | null
        }
        Update: {
          communication_id?: string
          created_at?: string
          destination_masked?: string | null
          display_name?: string
          household_id?: string | null
          id?: string
          preference_authorized?: boolean
          recipient_profile_id?: string | null
          suppression_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_recipients_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "communications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_recipients_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_recipients_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          archived_at: string | null
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at: string
          created_by_profile_id: string
          id: string
          message_body: string
          name: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          created_by_profile_id: string
          id?: string
          message_body: string
          name: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          channel?: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          created_by_profile_id?: string
          id?: string
          message_body?: string
          name?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_templates_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          audience_type: Database["public"]["Enums"]["communication_audience_type"]
          cancelled_at: string | null
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at: string
          created_by_profile_id: string
          event_id: string | null
          failure_reason: string | null
          household_id: string | null
          id: string
          message_body: string
          scheduled_for: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["communication_status"]
          subject: string | null
          synthetic_delivery: boolean
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience_type: Database["public"]["Enums"]["communication_audience_type"]
          cancelled_at?: string | null
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          created_by_profile_id: string
          event_id?: string | null
          failure_reason?: string | null
          household_id?: string | null
          id?: string
          message_body: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          subject?: string | null
          synthetic_delivery?: boolean
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience_type?: Database["public"]["Enums"]["communication_audience_type"]
          cancelled_at?: string | null
          channel?: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          created_by_profile_id?: string
          event_id?: string | null
          failure_reason?: string | null
          household_id?: string | null
          id?: string
          message_body?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          subject?: string | null
          synthetic_delivery?: boolean
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "communication_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_plan_lessons: {
        Row: {
          created_at: string
          created_by_profile_id: string
          curriculum_plan_id: string
          id: string
          lesson_id: string
          sequence_number: number
        }
        Insert: {
          created_at?: string
          created_by_profile_id: string
          curriculum_plan_id: string
          id?: string
          lesson_id: string
          sequence_number: number
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string
          curriculum_plan_id?: string
          id?: string
          lesson_id?: string
          sequence_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_plan_lessons_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_plan_lessons_curriculum_plan_id_fkey"
            columns: ["curriculum_plan_id"]
            isOneToOne: false
            referencedRelation: "curriculum_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_plan_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_plans: {
        Row: {
          archived_at: string | null
          audience: string | null
          created_at: string
          created_by_profile_id: string
          ends_on: string | null
          id: string
          starts_on: string | null
          status: Database["public"]["Enums"]["curriculum_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          audience?: string | null
          created_at?: string
          created_by_profile_id: string
          ends_on?: string | null
          id?: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["curriculum_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          audience?: string | null
          created_at?: string
          created_by_profile_id?: string
          ends_on?: string | null
          id?: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["curriculum_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_plans_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_form_answers: {
        Row: {
          boolean_value: boolean | null
          choice_value: string | null
          created_at: string
          date_value: string | null
          field_id: string
          id: string
          multiple_choice_value: Json | null
          submission_id: string
          text_value: string | null
        }
        Insert: {
          boolean_value?: boolean | null
          choice_value?: string | null
          created_at?: string
          date_value?: string | null
          field_id: string
          id?: string
          multiple_choice_value?: Json | null
          submission_id: string
          text_value?: string | null
        }
        Update: {
          boolean_value?: boolean | null
          choice_value?: string | null
          created_at?: string
          date_value?: string | null
          field_id?: string
          id?: string
          multiple_choice_value?: Json | null
          submission_id?: string
          text_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_form_answers_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "custom_form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "custom_form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_form_assignments: {
        Row: {
          archived_at: string | null
          archived_by_profile_id: string | null
          assigned_at: string
          assigned_by_profile_id: string
          assignment_type: Database["public"]["Enums"]["custom_form_assignment_type"]
          event_id: string | null
          household_id: string | null
          id: string
          is_general_ministry: boolean
          student_id: string | null
          version_id: string
          volunteer_profile_id: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by_profile_id?: string | null
          assigned_at?: string
          assigned_by_profile_id: string
          assignment_type: Database["public"]["Enums"]["custom_form_assignment_type"]
          event_id?: string | null
          household_id?: string | null
          id?: string
          is_general_ministry?: boolean
          student_id?: string | null
          version_id: string
          volunteer_profile_id?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by_profile_id?: string | null
          assigned_at?: string
          assigned_by_profile_id?: string
          assignment_type?: Database["public"]["Enums"]["custom_form_assignment_type"]
          event_id?: string | null
          household_id?: string | null
          id?: string
          is_general_ministry?: boolean
          student_id?: string | null
          version_id?: string
          volunteer_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_form_assignments_archived_by_profile_id_fkey"
            columns: ["archived_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_assignments_assigned_by_profile_id_fkey"
            columns: ["assigned_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_assignments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_assignments_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "custom_form_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_assignments_volunteer_profile_id_fkey"
            columns: ["volunteer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_form_fields: {
        Row: {
          choice_options: Json | null
          display_order: number
          field_key: string
          field_type: Database["public"]["Enums"]["custom_form_field_type"]
          help_text: string | null
          id: string
          is_required: boolean
          label: string
          maximum_date: string | null
          maximum_length: number | null
          minimum_date: string | null
          minimum_length: number | null
          version_id: string
        }
        Insert: {
          choice_options?: Json | null
          display_order: number
          field_key: string
          field_type: Database["public"]["Enums"]["custom_form_field_type"]
          help_text?: string | null
          id?: string
          is_required?: boolean
          label: string
          maximum_date?: string | null
          maximum_length?: number | null
          minimum_date?: string | null
          minimum_length?: number | null
          version_id: string
        }
        Update: {
          choice_options?: Json | null
          display_order?: number
          field_key?: string
          field_type?: Database["public"]["Enums"]["custom_form_field_type"]
          help_text?: string | null
          id?: string
          is_required?: boolean
          label?: string
          maximum_date?: string | null
          maximum_length?: number | null
          minimum_date?: string | null
          minimum_length?: number | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_form_fields_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "custom_form_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_form_submissions: {
        Row: {
          archived_at: string | null
          archived_by_profile_id: string | null
          assignment_id: string
          id: string
          status: Database["public"]["Enums"]["custom_form_submission_status"]
          subject_household_id: string | null
          subject_student_id: string | null
          subject_volunteer_profile_id: string | null
          submitted_at: string | null
          submitted_by_profile_id: string
          version_id: string
        }
        Insert: {
          archived_at?: string | null
          archived_by_profile_id?: string | null
          assignment_id: string
          id?: string
          status?: Database["public"]["Enums"]["custom_form_submission_status"]
          subject_household_id?: string | null
          subject_student_id?: string | null
          subject_volunteer_profile_id?: string | null
          submitted_at?: string | null
          submitted_by_profile_id: string
          version_id: string
        }
        Update: {
          archived_at?: string | null
          archived_by_profile_id?: string | null
          assignment_id?: string
          id?: string
          status?: Database["public"]["Enums"]["custom_form_submission_status"]
          subject_household_id?: string | null
          subject_student_id?: string | null
          subject_volunteer_profile_id?: string | null
          submitted_at?: string | null
          submitted_by_profile_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_form_submissions_archived_by_profile_id_fkey"
            columns: ["archived_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "custom_form_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_submissions_subject_household_id_fkey"
            columns: ["subject_household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_submissions_subject_student_id_fkey"
            columns: ["subject_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_submissions_subject_volunteer_profile_id_fkey"
            columns: ["subject_volunteer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_submissions_submitted_by_profile_id_fkey"
            columns: ["submitted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_submissions_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "custom_form_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_form_templates: {
        Row: {
          archived_at: string | null
          archived_by_profile_id: string | null
          created_at: string
          created_by_profile_id: string
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["custom_form_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id: string
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["custom_form_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id?: string
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["custom_form_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_form_templates_archived_by_profile_id_fkey"
            columns: ["archived_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_templates_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_form_versions: {
        Row: {
          created_at: string
          created_by_profile_id: string
          id: string
          instructions: string | null
          published_at: string | null
          published_by_profile_id: string | null
          status: Database["public"]["Enums"]["custom_form_version_status"]
          template_id: string
          title: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by_profile_id: string
          id?: string
          instructions?: string | null
          published_at?: string | null
          published_by_profile_id?: string | null
          status?: Database["public"]["Enums"]["custom_form_version_status"]
          template_id: string
          title: string
          version_number: number
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string
          id?: string
          instructions?: string | null
          published_at?: string | null
          published_by_profile_id?: string | null
          status?: Database["public"]["Enums"]["custom_form_version_status"]
          template_id?: string
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_form_versions_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_versions_published_by_profile_id_fkey"
            columns: ["published_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "custom_form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_paper_evidence_events: {
        Row: {
          action: Database["public"]["Enums"]["paper_evidence_action"]
          actor_profile_id: string
          id: string
          occurred_at: string
          reason: string | null
          submission_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["paper_evidence_action"]
          actor_profile_id: string
          id?: string
          occurred_at?: string
          reason?: string | null
          submission_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["paper_evidence_action"]
          actor_profile_id?: string
          id?: string
          occurred_at?: string
          reason?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_paper_evidence_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_paper_evidence_events_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "student_document_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_review_events: {
        Row: {
          action: Database["public"]["Enums"]["document_review_action"]
          actor_profile_id: string
          id: string
          occurred_at: string
          reason: string | null
          submission_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["document_review_action"]
          actor_profile_id: string
          id?: string
          occurred_at?: string
          reason?: string | null
          submission_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["document_review_action"]
          actor_profile_id?: string
          id?: string
          occurred_at?: string
          reason?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_review_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_review_events_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "student_document_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_template_versions: {
        Row: {
          blank_storage_bucket: string | null
          blank_storage_object_path: string | null
          checksum_sha256: string | null
          content_type: string | null
          created_at: string
          created_by_profile_id: string
          effective_from: string | null
          effective_to: string | null
          explicit_expires_on: string | null
          file_size_bytes: number | null
          id: string
          original_file_name: string | null
          published_at: string | null
          published_by_profile_id: string | null
          status: Database["public"]["Enums"]["document_template_version_status"]
          supersedes_version_id: string | null
          template_id: string
          valid_for: string | null
          validity_policy: Database["public"]["Enums"]["document_validity_policy"]
          version_number: number
        }
        Insert: {
          blank_storage_bucket?: string | null
          blank_storage_object_path?: string | null
          checksum_sha256?: string | null
          content_type?: string | null
          created_at?: string
          created_by_profile_id: string
          effective_from?: string | null
          effective_to?: string | null
          explicit_expires_on?: string | null
          file_size_bytes?: number | null
          id?: string
          original_file_name?: string | null
          published_at?: string | null
          published_by_profile_id?: string | null
          status?: Database["public"]["Enums"]["document_template_version_status"]
          supersedes_version_id?: string | null
          template_id: string
          valid_for?: string | null
          validity_policy: Database["public"]["Enums"]["document_validity_policy"]
          version_number: number
        }
        Update: {
          blank_storage_bucket?: string | null
          blank_storage_object_path?: string | null
          checksum_sha256?: string | null
          content_type?: string | null
          created_at?: string
          created_by_profile_id?: string
          effective_from?: string | null
          effective_to?: string | null
          explicit_expires_on?: string | null
          file_size_bytes?: number | null
          id?: string
          original_file_name?: string | null
          published_at?: string | null
          published_by_profile_id?: string | null
          status?: Database["public"]["Enums"]["document_template_version_status"]
          supersedes_version_id?: string | null
          template_id?: string
          valid_for?: string | null
          validity_policy?: Database["public"]["Enums"]["document_validity_policy"]
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_template_versions_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_template_versions_published_by_profile_id_fkey"
            columns: ["published_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_template_versions_supersedes_version_id_fkey"
            columns: ["supersedes_version_id"]
            isOneToOne: false
            referencedRelation: "document_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          archived_at: string | null
          archived_by_profile_id: string | null
          created_at: string
          created_by_profile_id: string
          description: string | null
          document_kind: Database["public"]["Enums"]["document_kind"]
          id: string
          name: string
          status: Database["public"]["Enums"]["document_template_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id: string
          description?: string | null
          document_kind: Database["public"]["Enums"]["document_kind"]
          id?: string
          name: string
          status?: Database["public"]["Enums"]["document_template_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id?: string
          description?: string | null
          document_kind?: Database["public"]["Enums"]["document_kind"]
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["document_template_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_archived_by_profile_id_fkey"
            columns: ["archived_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_templates_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_checklist_items: {
        Row: {
          completed_at: string | null
          completed_by_profile_id: string | null
          created_at: string
          created_by_profile_id: string
          due_at: string | null
          event_id: string
          id: string
          is_completed: boolean
          notes: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id: string
          due_at?: string | null
          event_id: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id?: string
          due_at?: string | null
          event_id?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_checklist_items_completed_by_profile_id_fkey"
            columns: ["completed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checklist_items_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checklist_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_document_requirements: {
        Row: {
          archived_at: string | null
          archived_by_profile_id: string | null
          blocks_participation: boolean
          created_at: string
          created_by_profile_id: string
          event_id: string
          id: string
          required: boolean
          template_id: string
          template_version_id: string
        }
        Insert: {
          archived_at?: string | null
          archived_by_profile_id?: string | null
          blocks_participation?: boolean
          created_at?: string
          created_by_profile_id: string
          event_id: string
          id?: string
          required?: boolean
          template_id: string
          template_version_id: string
        }
        Update: {
          archived_at?: string | null
          archived_by_profile_id?: string | null
          blocks_participation?: boolean
          created_at?: string
          created_by_profile_id?: string
          event_id?: string
          id?: string
          required?: boolean
          template_id?: string
          template_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_document_requirements_archived_by_profile_id_fkey"
            columns: ["archived_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_document_requirements_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_document_requirements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_document_requirements_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_document_requirements_template_version_id_template_i_fkey"
            columns: ["template_version_id", "template_id"]
            isOneToOne: false
            referencedRelation: "document_template_versions"
            referencedColumns: ["id", "template_id"]
          },
        ]
      }
      event_participation_overrides: {
        Row: {
          created_at: string
          created_by_profile_id: string
          event_id: string
          evidence: Json
          expires_at: string | null
          id: string
          reason: string
          registration_id: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by_profile_id: string | null
          student_id: string
          unmet_requirement_ids: string[]
        }
        Insert: {
          created_at?: string
          created_by_profile_id: string
          event_id: string
          evidence?: Json
          expires_at?: string | null
          id?: string
          reason: string
          registration_id: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by_profile_id?: string | null
          student_id: string
          unmet_requirement_ids: string[]
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string
          event_id?: string
          evidence?: Json
          expires_at?: string | null
          id?: string
          reason?: string
          registration_id?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by_profile_id?: string | null
          student_id?: string
          unmet_requirement_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "event_participation_overrides_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participation_overrides_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participation_overrides_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participation_overrides_revoked_by_profile_id_fkey"
            columns: ["revoked_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participation_overrides_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          cancelled_at: string | null
          cancelled_by_profile_id: string | null
          created_at: string
          created_by_profile_id: string
          event_id: string
          household_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["event_registration_status"]
          student_id: string
          updated_at: string
          waitlist_position: number | null
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id: string
          event_id: string
          household_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["event_registration_status"]
          student_id: string
          updated_at?: string
          waitlist_position?: number | null
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id?: string
          event_id?: string
          household_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["event_registration_status"]
          student_id?: string
          updated_at?: string
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_cancelled_by_profile_id_fkey"
            columns: ["cancelled_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reminders: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by_profile_id: string
          event_id: string
          id: string
          notes: string | null
          remind_at: string
          status: Database["public"]["Enums"]["event_reminder_status"]
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by_profile_id: string
          event_id: string
          id?: string
          notes?: string | null
          remind_at: string
          status?: Database["public"]["Enums"]["event_reminder_status"]
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by_profile_id?: string
          event_id?: string
          id?: string
          notes?: string | null
          remind_at?: string
          status?: Database["public"]["Enums"]["event_reminder_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reminders_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_volunteer_assignments: {
        Row: {
          assigned_by_profile_id: string | null
          assignment_role: string
          created_at: string
          ends_at: string | null
          event_id: string
          id: string
          profile_id: string
          starts_at: string | null
          status: Database["public"]["Enums"]["volunteer_assignment_status"]
          updated_at: string
        }
        Insert: {
          assigned_by_profile_id?: string | null
          assignment_role: string
          created_at?: string
          ends_at?: string | null
          event_id: string
          id?: string
          profile_id: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["volunteer_assignment_status"]
          updated_at?: string
        }
        Update: {
          assigned_by_profile_id?: string | null
          assignment_role?: string
          created_at?: string
          ends_at?: string | null
          event_id?: string
          id?: string
          profile_id?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["volunteer_assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_volunteer_assignments_assigned_by_profile_id_fkey"
            columns: ["assigned_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_volunteer_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_volunteer_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          archived_at: string | null
          building: string | null
          campus: string | null
          capacity: number | null
          created_at: string
          description: string | null
          ends_at: string
          event_type: string
          id: string
          meeting_instructions: string | null
          name: string
          registration_closes_at: string | null
          registration_opens_at: string | null
          room: string | null
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          timezone: string
          updated_at: string
          waitlist_capacity: number | null
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          building?: string | null
          campus?: string | null
          capacity?: number | null
          created_at?: string
          description?: string | null
          ends_at: string
          event_type: string
          id?: string
          meeting_instructions?: string | null
          name: string
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          room?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          timezone?: string
          updated_at?: string
          waitlist_capacity?: number | null
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          building?: string | null
          campus?: string | null
          capacity?: number | null
          created_at?: string
          description?: string | null
          ends_at?: string
          event_type?: string
          id?: string
          meeting_instructions?: string | null
          name?: string
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          room?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          timezone?: string
          updated_at?: string
          waitlist_capacity?: number | null
        }
        Relationships: []
      }
      family_check_in_tokens: {
        Row: {
          created_at: string
          created_by_profile_id: string | null
          expires_at: string
          household_id: string
          id: string
          revoked_at: string | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by_profile_id?: string | null
          expires_at: string
          household_id: string
          id?: string
          revoked_at?: string | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string | null
          expires_at?: string
          household_id?: string
          id?: string
          revoked_at?: string | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_check_in_tokens_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_check_in_tokens_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_memberships: {
        Row: {
          created_at: string
          household_id: string
          id: string
          is_primary_contact: boolean
          is_responsible_adult: boolean
          person_id: string
          receive_email: boolean
          receive_emergency_notifications: boolean
          receive_sms: boolean
          relationship_label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          is_primary_contact?: boolean
          is_responsible_adult?: boolean
          person_id: string
          receive_email?: boolean
          receive_emergency_notifications?: boolean
          receive_sms?: boolean
          relationship_label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          is_primary_contact?: boolean
          is_responsible_adult?: boolean
          person_id?: string
          receive_email?: boolean
          receive_emergency_notifications?: boolean
          receive_sms?: boolean
          relationship_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_memberships_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_memberships_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          archived_at: string | null
          city: string | null
          country_code: string
          created_at: string
          id: string
          name: string
          postal_code: string | null
          region: string | null
          status: Database["public"]["Enums"]["household_status"]
          updated_at: string
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          archived_at?: string | null
          city?: string | null
          country_code?: string
          created_at?: string
          id?: string
          name: string
          postal_code?: string | null
          region?: string | null
          status?: Database["public"]["Enums"]["household_status"]
          updated_at?: string
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          archived_at?: string | null
          city?: string | null
          country_code?: string
          created_at?: string
          id?: string
          name?: string
          postal_code?: string | null
          region?: string | null
          status?: Database["public"]["Enums"]["household_status"]
          updated_at?: string
        }
        Relationships: []
      }
      in_app_notifications: {
        Row: {
          announcement_id: string | null
          communication_id: string | null
          created_at: string
          id: string
          message_body: string
          read_at: string | null
          recipient_profile_id: string
          title: string
        }
        Insert: {
          announcement_id?: string | null
          communication_id?: string | null
          created_at?: string
          id?: string
          message_body: string
          read_at?: string | null
          recipient_profile_id: string
          title: string
        }
        Update: {
          announcement_id?: string | null
          communication_id?: string | null
          created_at?: string
          id?: string
          message_body?: string
          read_at?: string | null
          recipient_profile_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_app_notifications_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "communications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_app_notifications_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          archived_at: string | null
          audience: string | null
          created_at: string
          created_by_profile_id: string
          discussion_guide: string | null
          id: string
          lesson_body: string | null
          preparation_notes: string | null
          scripture_references: string | null
          status: Database["public"]["Enums"]["lesson_status"]
          summary: string | null
          teaching_objective: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          audience?: string | null
          created_at?: string
          created_by_profile_id: string
          discussion_guide?: string | null
          id?: string
          lesson_body?: string | null
          preparation_notes?: string | null
          scripture_references?: string | null
          status?: Database["public"]["Enums"]["lesson_status"]
          summary?: string | null
          teaching_objective?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          audience?: string | null
          created_at?: string
          created_by_profile_id?: string
          discussion_guide?: string | null
          id?: string
          lesson_body?: string | null
          preparation_notes?: string | null
          scripture_references?: string | null
          status?: Database["public"]["Enums"]["lesson_status"]
          summary?: string | null
          teaching_objective?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      library_resource_versions: {
        Row: {
          change_summary: string | null
          checksum_sha256: string | null
          content_type: string
          created_at: string
          created_by_profile_id: string
          file_size_bytes: number
          id: string
          original_file_name: string
          resource_id: string
          storage_bucket: string
          storage_object_path: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          checksum_sha256?: string | null
          content_type: string
          created_at?: string
          created_by_profile_id: string
          file_size_bytes: number
          id?: string
          original_file_name: string
          resource_id: string
          storage_bucket: string
          storage_object_path: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          checksum_sha256?: string | null
          content_type?: string
          created_at?: string
          created_by_profile_id?: string
          file_size_bytes?: number
          id?: string
          original_file_name?: string
          resource_id?: string
          storage_bucket?: string
          storage_object_path?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "library_resource_versions_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_resource_versions_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "library_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      library_resources: {
        Row: {
          archived_at: string | null
          audience: Database["public"]["Enums"]["library_resource_audience"]
          category_id: string | null
          created_at: string
          created_by_profile_id: string
          current_version_id: string | null
          description: string | null
          id: string
          published_at: string | null
          resource_type: Database["public"]["Enums"]["library_resource_type"]
          status: Database["public"]["Enums"]["library_resource_status"]
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          audience?: Database["public"]["Enums"]["library_resource_audience"]
          category_id?: string | null
          created_at?: string
          created_by_profile_id: string
          current_version_id?: string | null
          description?: string | null
          id?: string
          published_at?: string | null
          resource_type: Database["public"]["Enums"]["library_resource_type"]
          status?: Database["public"]["Enums"]["library_resource_status"]
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          audience?: Database["public"]["Enums"]["library_resource_audience"]
          category_id?: string | null
          created_at?: string
          created_by_profile_id?: string
          current_version_id?: string | null
          description?: string | null
          id?: string
          published_at?: string | null
          resource_type?: Database["public"]["Enums"]["library_resource_type"]
          status?: Database["public"]["Enums"]["library_resource_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_resources_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_resources_current_version_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "library_resource_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      member_tag_assignments: {
        Row: {
          created_at: string
          id: string
          person_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          person_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          person_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_tag_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "member_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      member_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ministry_schedules: {
        Row: {
          allow_unfilled_on_publish: boolean
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by_profile_id: string
          ends_at: string
          event_id: string | null
          id: string
          ministry_context: string | null
          name: string
          notes: string | null
          occurrence_date: string | null
          published_at: string | null
          rotation_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["ministry_schedule_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          allow_unfilled_on_publish?: boolean
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_profile_id: string
          ends_at: string
          event_id?: string | null
          id?: string
          ministry_context?: string | null
          name: string
          notes?: string | null
          occurrence_date?: string | null
          published_at?: string | null
          rotation_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["ministry_schedule_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          allow_unfilled_on_publish?: boolean
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_profile_id?: string
          ends_at?: string
          event_id?: string | null
          id?: string
          ministry_context?: string | null
          name?: string
          notes?: string | null
          occurrence_date?: string | null
          published_at?: string | null
          rotation_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["ministry_schedule_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministry_schedule_rotation_fk"
            columns: ["rotation_id"]
            isOneToOne: false
            referencedRelation: "schedule_rotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_schedules_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          archived_at: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          preferred_name: string | null
          status: Database["public"]["Enums"]["person_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          preferred_name?: string | null
          status?: Database["public"]["Enums"]["person_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          preferred_name?: string | null
          status?: Database["public"]["Enums"]["person_status"]
          updated_at?: string
        }
        Relationships: []
      }
      prayer_requests: {
        Row: {
          answer_summary: string | null
          answered_at: string | null
          answered_by_profile_id: string | null
          archived_at: string | null
          assigned_to_profile_id: string | null
          category_id: string | null
          created_at: string
          id: string
          person_id: string
          request_details: string
          status: Database["public"]["Enums"]["prayer_request_status"]
          submitted_by_profile_id: string
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["prayer_request_visibility"]
        }
        Insert: {
          answer_summary?: string | null
          answered_at?: string | null
          answered_by_profile_id?: string | null
          archived_at?: string | null
          assigned_to_profile_id?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          person_id: string
          request_details: string
          status?: Database["public"]["Enums"]["prayer_request_status"]
          submitted_by_profile_id: string
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["prayer_request_visibility"]
        }
        Update: {
          answer_summary?: string | null
          answered_at?: string | null
          answered_by_profile_id?: string | null
          archived_at?: string | null
          assigned_to_profile_id?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          person_id?: string
          request_details?: string
          status?: Database["public"]["Enums"]["prayer_request_status"]
          submitted_by_profile_id?: string
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["prayer_request_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "prayer_requests_answered_by_profile_id_fkey"
            columns: ["answered_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_assigned_to_profile_id_fkey"
            columns: ["assigned_to_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "care_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_submitted_by_profile_id_fkey"
            columns: ["submitted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_capability_grants: {
        Row: {
          capability: Database["public"]["Enums"]["forms_capability"]
          expires_at: string | null
          grant_reason: string
          granted_at: string
          granted_by_profile_id: string
          id: string
          profile_id: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by_profile_id: string | null
        }
        Insert: {
          capability: Database["public"]["Enums"]["forms_capability"]
          expires_at?: string | null
          grant_reason: string
          granted_at?: string
          granted_by_profile_id: string
          id?: string
          profile_id: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by_profile_id?: string | null
        }
        Update: {
          capability?: Database["public"]["Enums"]["forms_capability"]
          expires_at?: string | null
          grant_reason?: string
          granted_at?: string
          granted_by_profile_id?: string
          id?: string
          profile_id?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_capability_grants_granted_by_profile_id_fkey"
            columns: ["granted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_capability_grants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_capability_grants_revoked_by_profile_id_fkey"
            columns: ["revoked_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          person_id: string | null
          primary_role: Database["public"]["Enums"]["account_role"]
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          person_id?: string | null
          primary_role?: Database["public"]["Enums"]["account_role"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          person_id?: string | null
          primary_role?: Database["public"]["Enums"]["account_role"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      report_saved_configurations: {
        Row: {
          archived_at: string | null
          configuration: Json
          created_at: string
          creator_profile_id: string
          id: string
          name: string
          report_type: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          configuration?: Json
          created_at?: string
          creator_profile_id: string
          id?: string
          name: string
          report_type: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          configuration?: Json
          created_at?: string
          creator_profile_id?: string
          id?: string
          name?: string
          report_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_saved_configurations_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_categories: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by_profile_id: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by_profile_id: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by_profile_id?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_categories_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_assignments: {
        Row: {
          assigned_by_profile_id: string
          conflict_codes: string[]
          conflict_overridden: boolean
          created_at: string
          ends_at: string
          id: string
          location_id: string | null
          override_reason: string | null
          position_id: string
          profile_id: string
          responsibility: string
          rotation_id: string | null
          schedule_id: string
          starts_at: string
          status: Database["public"]["Enums"]["schedule_assignment_status"]
          updated_at: string
        }
        Insert: {
          assigned_by_profile_id: string
          conflict_codes?: string[]
          conflict_overridden?: boolean
          created_at?: string
          ends_at: string
          id?: string
          location_id?: string | null
          override_reason?: string | null
          position_id: string
          profile_id: string
          responsibility: string
          rotation_id?: string | null
          schedule_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["schedule_assignment_status"]
          updated_at?: string
        }
        Update: {
          assigned_by_profile_id?: string
          conflict_codes?: string[]
          conflict_overridden?: boolean
          created_at?: string
          ends_at?: string
          id?: string
          location_id?: string | null
          override_reason?: string | null
          position_id?: string
          profile_id?: string
          responsibility?: string
          rotation_id?: string | null
          schedule_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["schedule_assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_assignment_location_fk"
            columns: ["location_id", "schedule_id"]
            isOneToOne: false
            referencedRelation: "schedule_locations"
            referencedColumns: ["id", "schedule_id"]
          },
          {
            foreignKeyName: "schedule_assignment_position_fk"
            columns: ["position_id", "schedule_id"]
            isOneToOne: false
            referencedRelation: "schedule_positions"
            referencedColumns: ["id", "schedule_id"]
          },
          {
            foreignKeyName: "schedule_assignment_rotation_fk"
            columns: ["rotation_id"]
            isOneToOne: false
            referencedRelation: "schedule_rotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_assignments_assigned_by_profile_id_fkey"
            columns: ["assigned_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "volunteer_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "schedule_assignments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "ministry_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_locations: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          schedule_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          schedule_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          schedule_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_locations_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "ministry_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_positions: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          location_id: string | null
          notes: string | null
          required_count: number
          responsibility: string
          schedule_id: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          required_count?: number
          responsibility: string
          schedule_id: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          required_count?: number
          responsibility?: string
          schedule_id?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_position_location_fk"
            columns: ["location_id", "schedule_id"]
            isOneToOne: false
            referencedRelation: "schedule_locations"
            referencedColumns: ["id", "schedule_id"]
          },
          {
            foreignKeyName: "schedule_positions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "ministry_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_rotations: {
        Row: {
          created_at: string
          created_by_profile_id: string
          ends_at: string
          ends_on: string | null
          id: string
          location_name: string | null
          ministry_context: string | null
          monthly_ordinal: number | null
          name: string
          profile_id: string | null
          recurrence_pattern: Database["public"]["Enums"]["schedule_recurrence_pattern"]
          responsibility: string
          schedule_name: string
          starts_at: string
          starts_on: string
          status: Database["public"]["Enums"]["schedule_rotation_status"]
          timezone: string
          updated_at: string
          weekday: number | null
        }
        Insert: {
          created_at?: string
          created_by_profile_id: string
          ends_at: string
          ends_on?: string | null
          id?: string
          location_name?: string | null
          ministry_context?: string | null
          monthly_ordinal?: number | null
          name: string
          profile_id?: string | null
          recurrence_pattern: Database["public"]["Enums"]["schedule_recurrence_pattern"]
          responsibility: string
          schedule_name: string
          starts_at: string
          starts_on: string
          status?: Database["public"]["Enums"]["schedule_rotation_status"]
          timezone?: string
          updated_at?: string
          weekday?: number | null
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string
          ends_at?: string
          ends_on?: string | null
          id?: string
          location_name?: string | null
          ministry_context?: string | null
          monthly_ordinal?: number | null
          name?: string
          profile_id?: string | null
          recurrence_pattern?: Database["public"]["Enums"]["schedule_recurrence_pattern"]
          responsibility?: string
          schedule_name?: string
          starts_at?: string
          starts_on?: string
          status?: Database["public"]["Enums"]["schedule_rotation_status"]
          timezone?: string
          updated_at?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_rotations_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_rotations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "volunteer_profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      school_year_medical_requirements: {
        Row: {
          archived_at: string | null
          archived_by_profile_id: string | null
          created_at: string
          created_by_profile_id: string
          id: string
          school_year_end: string
          school_year_start: string
          template_version_id: string
        }
        Insert: {
          archived_at?: string | null
          archived_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id: string
          id?: string
          school_year_end: string
          school_year_start: string
          template_version_id: string
        }
        Update: {
          archived_at?: string | null
          archived_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id?: string
          id?: string
          school_year_end?: string
          school_year_start?: string
          template_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_year_medical_requirements_archived_by_profile_id_fkey"
            columns: ["archived_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_year_medical_requirements_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_year_medical_requirements_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "document_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_document_submissions: {
        Row: {
          archived_at: string | null
          archived_by_profile_id: string | null
          checksum_sha256: string | null
          content_type: string | null
          created_at: string
          digital_status: Database["public"]["Enums"]["document_digital_status"]
          expires_on: string | null
          file_size_bytes: number | null
          household_id: string
          id: string
          lifecycle_status: Database["public"]["Enums"]["document_lifecycle_status"]
          original_file_name: string | null
          storage_bucket: string | null
          storage_object_path: string | null
          student_id: string
          submitted_by_profile_id: string
          superseded_at: string | null
          supersedes_submission_id: string | null
          template_version_id: string
          upload_source: Database["public"]["Enums"]["document_upload_source"]
          valid_from: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by_profile_id?: string | null
          checksum_sha256?: string | null
          content_type?: string | null
          created_at?: string
          digital_status?: Database["public"]["Enums"]["document_digital_status"]
          expires_on?: string | null
          file_size_bytes?: number | null
          household_id: string
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["document_lifecycle_status"]
          original_file_name?: string | null
          storage_bucket?: string | null
          storage_object_path?: string | null
          student_id: string
          submitted_by_profile_id: string
          superseded_at?: string | null
          supersedes_submission_id?: string | null
          template_version_id: string
          upload_source: Database["public"]["Enums"]["document_upload_source"]
          valid_from?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by_profile_id?: string | null
          checksum_sha256?: string | null
          content_type?: string | null
          created_at?: string
          digital_status?: Database["public"]["Enums"]["document_digital_status"]
          expires_on?: string | null
          file_size_bytes?: number | null
          household_id?: string
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["document_lifecycle_status"]
          original_file_name?: string | null
          storage_bucket?: string | null
          storage_object_path?: string | null
          student_id?: string
          submitted_by_profile_id?: string
          superseded_at?: string | null
          supersedes_submission_id?: string | null
          template_version_id?: string
          upload_source?: Database["public"]["Enums"]["document_upload_source"]
          valid_from?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_document_submissions_archived_by_profile_id_fkey"
            columns: ["archived_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_document_submissions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_document_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_document_submissions_submitted_by_profile_id_fkey"
            columns: ["submitted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_document_submissions_supersedes_submission_id_fkey"
            columns: ["supersedes_submission_id"]
            isOneToOne: false
            referencedRelation: "student_document_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_document_submissions_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "document_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_relationships: {
        Row: {
          created_at: string
          id: string
          is_authorized_pickup: boolean
          is_emergency_contact: boolean
          is_legal_guardian: boolean
          may_sign_permission_forms: boolean
          may_view_student_information: boolean
          person_id: string
          receive_email: boolean
          receive_sms: boolean
          relationship_type: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_authorized_pickup?: boolean
          is_emergency_contact?: boolean
          is_legal_guardian?: boolean
          may_sign_permission_forms?: boolean
          may_view_student_information?: boolean
          person_id: string
          receive_email?: boolean
          receive_sms?: boolean
          relationship_type: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_authorized_pickup?: boolean
          is_emergency_contact?: boolean
          is_legal_guardian?: boolean
          may_sign_permission_forms?: boolean
          may_view_student_information?: boolean
          person_id?: string
          receive_email?: boolean
          receive_sms?: boolean
          relationship_type?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_relationships_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_relationships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          allergy_summary: string | null
          archived_at: string | null
          birth_date: string
          created_at: string
          dietary_summary: string | null
          grade: string
          id: string
          medical_summary: string | null
          person_id: string
          primary_household_id: string
          status: Database["public"]["Enums"]["student_status"]
          updated_at: string
        }
        Insert: {
          allergy_summary?: string | null
          archived_at?: string | null
          birth_date: string
          created_at?: string
          dietary_summary?: string | null
          grade: string
          id?: string
          medical_summary?: string | null
          person_id: string
          primary_household_id: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Update: {
          allergy_summary?: string | null
          archived_at?: string | null
          birth_date?: string
          created_at?: string
          dietary_summary?: string | null
          grade?: string
          id?: string
          medical_summary?: string | null
          person_id?: string
          primary_household_id?: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_primary_household_id_fkey"
            columns: ["primary_household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_resources: {
        Row: {
          archived_at: string | null
          content_type: string | null
          created_at: string
          created_by_profile_id: string
          description: string | null
          external_url: string | null
          file_size_bytes: number | null
          id: string
          lesson_id: string
          original_file_name: string | null
          resource_type: Database["public"]["Enums"]["teaching_resource_type"]
          storage_bucket: string | null
          storage_object_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          content_type?: string | null
          created_at?: string
          created_by_profile_id: string
          description?: string | null
          external_url?: string | null
          file_size_bytes?: number | null
          id?: string
          lesson_id: string
          original_file_name?: string | null
          resource_type: Database["public"]["Enums"]["teaching_resource_type"]
          storage_bucket?: string | null
          storage_object_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          content_type?: string | null
          created_at?: string
          created_by_profile_id?: string
          description?: string | null
          external_url?: string | null
          file_size_bytes?: number | null
          id?: string
          lesson_id?: string
          original_file_name?: string | null
          resource_type?: Database["public"]["Enums"]["teaching_resource_type"]
          storage_bucket?: string | null
          storage_object_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_resources_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_card_links: {
        Row: {
          household_id: string | null
          id: string
          link_reason: string
          link_type: Database["public"]["Enums"]["visitor_card_link_type"]
          linked_at: string
          linked_by_profile_id: string
          person_id: string | null
          student_id: string | null
          visitor_card_id: string
        }
        Insert: {
          household_id?: string | null
          id?: string
          link_reason: string
          link_type: Database["public"]["Enums"]["visitor_card_link_type"]
          linked_at?: string
          linked_by_profile_id: string
          person_id?: string | null
          student_id?: string | null
          visitor_card_id: string
        }
        Update: {
          household_id?: string | null
          id?: string
          link_reason?: string
          link_type?: Database["public"]["Enums"]["visitor_card_link_type"]
          linked_at?: string
          linked_by_profile_id?: string
          person_id?: string | null
          student_id?: string | null
          visitor_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_card_links_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_card_links_linked_by_profile_id_fkey"
            columns: ["linked_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_card_links_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_card_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_card_links_visitor_card_id_fkey"
            columns: ["visitor_card_id"]
            isOneToOne: false
            referencedRelation: "visitor_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_card_rate_limits: {
        Row: {
          expires_at: string
          fingerprint_hash: string
          request_count: number
          window_started_at: string
        }
        Insert: {
          expires_at: string
          fingerprint_hash: string
          request_count?: number
          window_started_at: string
        }
        Update: {
          expires_at?: string
          fingerprint_hash?: string
          request_count?: number
          window_started_at?: string
        }
        Relationships: []
      }
      visitor_card_review_events: {
        Row: {
          action: Database["public"]["Enums"]["visitor_card_review_action"]
          actor_profile_id: string
          id: string
          occurred_at: string
          reason: string | null
          visitor_card_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["visitor_card_review_action"]
          actor_profile_id: string
          id?: string
          occurred_at?: string
          reason?: string | null
          visitor_card_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["visitor_card_review_action"]
          actor_profile_id?: string
          id?: string
          occurred_at?: string
          reason?: string | null
          visitor_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_card_review_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_card_review_events_visitor_card_id_fkey"
            columns: ["visitor_card_id"]
            isOneToOne: false
            referencedRelation: "visitor_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_cards: {
        Row: {
          archived_at: string | null
          archived_by_profile_id: string | null
          created_at: string
          email: string | null
          event_id: string | null
          follow_up_email: boolean
          follow_up_notes: string | null
          follow_up_phone: boolean
          grade_or_age_group: string | null
          guardian_name: string | null
          how_heard: string | null
          id: string
          invited_by: string | null
          phone: string | null
          privacy_acknowledged_at: string | null
          privacy_acknowledgment_version: string | null
          source: Database["public"]["Enums"]["visitor_card_source"]
          status: Database["public"]["Enums"]["visitor_card_status"]
          submitted_by_profile_id: string | null
          updated_at: string
          visit_date: string
          youth_first_name: string
          youth_last_name: string
        }
        Insert: {
          archived_at?: string | null
          archived_by_profile_id?: string | null
          created_at?: string
          email?: string | null
          event_id?: string | null
          follow_up_email?: boolean
          follow_up_notes?: string | null
          follow_up_phone?: boolean
          grade_or_age_group?: string | null
          guardian_name?: string | null
          how_heard?: string | null
          id?: string
          invited_by?: string | null
          phone?: string | null
          privacy_acknowledged_at?: string | null
          privacy_acknowledgment_version?: string | null
          source: Database["public"]["Enums"]["visitor_card_source"]
          status?: Database["public"]["Enums"]["visitor_card_status"]
          submitted_by_profile_id?: string | null
          updated_at?: string
          visit_date?: string
          youth_first_name: string
          youth_last_name: string
        }
        Update: {
          archived_at?: string | null
          archived_by_profile_id?: string | null
          created_at?: string
          email?: string | null
          event_id?: string | null
          follow_up_email?: boolean
          follow_up_notes?: string | null
          follow_up_phone?: boolean
          grade_or_age_group?: string | null
          guardian_name?: string | null
          how_heard?: string | null
          id?: string
          invited_by?: string | null
          phone?: string | null
          privacy_acknowledged_at?: string | null
          privacy_acknowledgment_version?: string | null
          source?: Database["public"]["Enums"]["visitor_card_source"]
          status?: Database["public"]["Enums"]["visitor_card_status"]
          submitted_by_profile_id?: string | null
          updated_at?: string
          visit_date?: string
          youth_first_name?: string
          youth_last_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_cards_archived_by_profile_id_fkey"
            columns: ["archived_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_cards_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_cards_submitted_by_profile_id_fkey"
            columns: ["submitted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_check_ins: {
        Row: {
          checked_in_at: string
          checked_in_by_profile_id: string | null
          checked_out_at: string | null
          checked_out_by_profile_id: string | null
          converted_student_id: string | null
          created_at: string
          event_id: string
          first_name: string
          grade: string | null
          guardian_contact: string
          guardian_name: string
          id: string
          last_name: string
          status: Database["public"]["Enums"]["visitor_check_in_status"]
          updated_at: string
        }
        Insert: {
          checked_in_at?: string
          checked_in_by_profile_id?: string | null
          checked_out_at?: string | null
          checked_out_by_profile_id?: string | null
          converted_student_id?: string | null
          created_at?: string
          event_id: string
          first_name: string
          grade?: string | null
          guardian_contact: string
          guardian_name: string
          id?: string
          last_name: string
          status?: Database["public"]["Enums"]["visitor_check_in_status"]
          updated_at?: string
        }
        Update: {
          checked_in_at?: string
          checked_in_by_profile_id?: string | null
          checked_out_at?: string | null
          checked_out_by_profile_id?: string | null
          converted_student_id?: string | null
          created_at?: string
          event_id?: string
          first_name?: string
          grade?: string | null
          guardian_contact?: string
          guardian_name?: string
          id?: string
          last_name?: string
          status?: Database["public"]["Enums"]["visitor_check_in_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_check_ins_checked_in_by_profile_id_fkey"
            columns: ["checked_in_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_check_ins_checked_out_by_profile_id_fkey"
            columns: ["checked_out_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_check_ins_converted_student_id_fkey"
            columns: ["converted_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_check_ins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_availability: {
        Row: {
          created_at: string
          day_of_week: number
          effective_from: string
          effective_until: string | null
          ends_at: string
          id: string
          notes: string | null
          profile_id: string
          starts_at: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          effective_from?: string
          effective_until?: string | null
          ends_at: string
          id?: string
          notes?: string | null
          profile_id: string
          starts_at: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          effective_from?: string
          effective_until?: string | null
          ends_at?: string
          id?: string
          notes?: string | null
          profile_id?: string
          starts_at?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_availability_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "volunteer_profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      volunteer_certifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          issued_at: string | null
          issuer: string | null
          name: string
          profile_id: string
          reference: string | null
          status: Database["public"]["Enums"]["volunteer_certification_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          name: string
          profile_id: string
          reference?: string | null
          status?: Database["public"]["Enums"]["volunteer_certification_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          name?: string
          profile_id?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["volunteer_certification_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_certifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "volunteer_profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      volunteer_profiles: {
        Row: {
          background_check_completed_at: string | null
          background_check_expires_at: string | null
          background_check_reference: string | null
          background_check_status: Database["public"]["Enums"]["background_check_status"]
          created_at: string
          is_active: boolean
          ministry_title: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          background_check_completed_at?: string | null
          background_check_expires_at?: string | null
          background_check_reference?: string | null
          background_check_status?: Database["public"]["Enums"]["background_check_status"]
          created_at?: string
          is_active?: boolean
          ministry_title?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          background_check_completed_at?: string | null
          background_check_expires_at?: string | null
          background_check_reference?: string | null
          background_check_status?: Database["public"]["Enums"]["background_check_status"]
          created_at?: string
          is_active?: boolean
          ministry_title?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_skill_assignments: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          profile_id: string
          skill_id: string
          skill_level: Database["public"]["Enums"]["volunteer_skill_level"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          profile_id: string
          skill_id: string
          skill_level?: Database["public"]["Enums"]["volunteer_skill_level"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          profile_id?: string
          skill_id?: string
          skill_level?: Database["public"]["Enums"]["volunteer_skill_level"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_skill_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "volunteer_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "volunteer_skill_assignments_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "volunteer_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_skills: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_document_submission: {
        Args: { p_reason?: string; p_submission_id: string }
        Returns: undefined
      }
      add_child_relationship: {
        Args: {
          p_is_authorized_pickup: boolean
          p_is_emergency_contact: boolean
          p_is_legal_guardian: boolean
          p_may_sign_permission_forms: boolean
          p_may_view_student_information: boolean
          p_person_id: string
          p_receive_email: boolean
          p_receive_sms: boolean
          p_relationship_type: string
          p_student_id: string
        }
        Returns: undefined
      }
      add_family_adult: {
        Args: {
          p_email: string
          p_first_name: string
          p_household_id: string
          p_is_primary_contact: boolean
          p_is_responsible_adult: boolean
          p_last_name: string
          p_phone: string
          p_preferred_name: string
          p_receive_email: boolean
          p_receive_emergency_notifications: boolean
          p_receive_sms: boolean
          p_relationship_label: string
        }
        Returns: string
      }
      add_lesson_to_curriculum_plan: {
        Args: { p_curriculum_plan_id: string; p_lesson_id: string }
        Returns: string
      }
      add_schedule_location: {
        Args: { p_name: string; p_notes?: string; p_schedule_id: string }
        Returns: string
      }
      add_schedule_position: {
        Args: {
          p_ends_at?: string
          p_location_id: string
          p_required_count: number
          p_responsibility: string
          p_schedule_id: string
          p_starts_at?: string
        }
        Returns: string
      }
      admin_update_account: {
        Args: {
          p_display_name: string
          p_primary_role: Database["public"]["Enums"]["account_role"]
          p_profile_id: string
          p_status: Database["public"]["Enums"]["account_status"]
        }
        Returns: undefined
      }
      answer_prayer_request: {
        Args: { p_answer_summary?: string; p_prayer_request_id: string }
        Returns: undefined
      }
      archive_announcement: {
        Args: { p_announcement_id: string }
        Returns: undefined
      }
      archive_care_category: {
        Args: { p_category_id: string }
        Returns: undefined
      }
      archive_care_follow_up: {
        Args: { p_care_follow_up_id: string }
        Returns: undefined
      }
      archive_care_note: {
        Args: { p_care_note_id: string }
        Returns: undefined
      }
      archive_communication_template: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      archive_curriculum_plan: {
        Args: { p_curriculum_plan_id: string }
        Returns: undefined
      }
      archive_custom_form_assignment: {
        Args: { p_assignment_id: string }
        Returns: undefined
      }
      archive_custom_form_submission: {
        Args: { p_submission_id: string }
        Returns: undefined
      }
      archive_custom_form_template: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      archive_document_template: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      archive_event: { Args: { p_event_id: string }; Returns: undefined }
      archive_lesson: { Args: { p_lesson_id: string }; Returns: undefined }
      archive_library_resource: {
        Args: { p_resource_id: string }
        Returns: undefined
      }
      archive_prayer_request: {
        Args: { p_prayer_request_id: string }
        Returns: undefined
      }
      archive_resource_category: {
        Args: { p_category_id: string }
        Returns: undefined
      }
      archive_saved_report: { Args: { p_id: string }; Returns: undefined }
      archive_teaching_resource: {
        Args: { p_teaching_resource_id: string }
        Returns: undefined
      }
      archive_visitor_card: {
        Args: { p_reason: string; p_visitor_card_id: string }
        Returns: undefined
      }
      assign_care_note: {
        Args: { p_assigned_to_profile_id: string; p_care_note_id: string }
        Returns: undefined
      }
      assign_prayer_request: {
        Args: { p_assigned_to_profile_id: string; p_prayer_request_id: string }
        Returns: undefined
      }
      assign_schedule_position: {
        Args: {
          p_ends_at: string
          p_override?: boolean
          p_override_reason?: string
          p_position_id: string
          p_profile_id: string
          p_starts_at: string
        }
        Returns: string
      }
      authorize_curriculum_resource_download: {
        Args: { p_teaching_resource_id: string }
        Returns: Json
      }
      authorize_document_submission_download: {
        Args: { p_submission_id: string }
        Returns: Json
      }
      authorize_document_submission_finalization: {
        Args: { p_submission_id: string }
        Returns: Json
      }
      authorize_document_template_master_download: {
        Args: { p_version_id: string }
        Returns: Json
      }
      authorize_document_template_master_finalization: {
        Args: { p_version_id: string }
        Returns: Json
      }
      authorize_library_resource_download: {
        Args: { p_resource_id: string; p_version_id?: string }
        Returns: Json
      }
      begin_visitor_card_review: {
        Args: { p_visitor_card_id: string }
        Returns: undefined
      }
      cancel_care_follow_up: {
        Args: { p_cancellation_reason: string; p_care_follow_up_id: string }
        Returns: undefined
      }
      cancel_my_event_registration: {
        Args: { p_registration_id: string }
        Returns: undefined
      }
      cancel_schedule_assignment: {
        Args: { p_assignment_id: string }
        Returns: undefined
      }
      check_in_student: {
        Args: { p_event_id: string; p_student_id: string }
        Returns: string
      }
      check_in_visitor: {
        Args: {
          p_event_id: string
          p_first_name: string
          p_grade: string
          p_guardian_contact: string
          p_guardian_name: string
          p_last_name: string
        }
        Returns: string
      }
      check_out_student: {
        Args: {
          p_event_id: string
          p_override_reason: string
          p_pickup_person_id: string
          p_student_id: string
        }
        Returns: undefined
      }
      check_out_visitor: { Args: { p_visitor_id: string }; Returns: undefined }
      clear_visitor_card_duplicate: {
        Args: { p_reason: string; p_visitor_card_id: string }
        Returns: undefined
      }
      close_visitor_card: {
        Args: { p_reason: string; p_visitor_card_id: string }
        Returns: undefined
      }
      complete_care_follow_up: {
        Args: { p_care_follow_up_id: string; p_completion_notes?: string }
        Returns: undefined
      }
      complete_visitor_card_conversion: {
        Args: { p_visitor_card_id: string }
        Returns: undefined
      }
      confirm_document_paper_copy: {
        Args: { p_reason?: string; p_submission_id: string }
        Returns: undefined
      }
      correct_student_check_in: {
        Args: { p_event_id: string; p_reason: string; p_student_id: string }
        Returns: undefined
      }
      create_announcement: {
        Args: {
          p_audience_type: Database["public"]["Enums"]["communication_audience_type"]
          p_expires_at?: string
          p_message_body: string
          p_title: string
        }
        Returns: string
      }
      create_attendance_session: {
        Args: {
          p_class_name: string
          p_ends_at: string
          p_event_id: string
          p_session_date: string
          p_starts_at: string
        }
        Returns: string
      }
      create_care_category: {
        Args: { p_description?: string; p_name: string; p_sort_order?: number }
        Returns: string
      }
      create_care_follow_up: {
        Args: {
          p_assigned_to_profile_id: string
          p_care_note_id: string
          p_due_at?: string
          p_instructions: string
          p_person_id: string
          p_prayer_request_id: string
          p_priority: Database["public"]["Enums"]["care_follow_up_priority"]
          p_title: string
        }
        Returns: string
      }
      create_care_note: {
        Args: {
          p_category_id: string
          p_note_content: string
          p_occurred_at?: string
          p_person_id: string
          p_title: string
        }
        Returns: string
      }
      create_child: {
        Args: {
          p_allergy_summary: string
          p_birth_date: string
          p_dietary_summary: string
          p_first_name: string
          p_grade: string
          p_guardian_person_id: string
          p_household_id: string
          p_last_name: string
          p_medical_summary: string
          p_preferred_name: string
          p_status: Database["public"]["Enums"]["student_status"]
        }
        Returns: string
      }
      create_communication_template: {
        Args: {
          p_channel: Database["public"]["Enums"]["communication_channel"]
          p_message_body: string
          p_name: string
          p_subject: string
        }
        Returns: string
      }
      create_curriculum_plan: {
        Args: {
          p_audience: string
          p_ends_on: string
          p_starts_on: string
          p_status: Database["public"]["Enums"]["curriculum_status"]
          p_summary: string
          p_title: string
        }
        Returns: string
      }
      create_custom_form_assignment: {
        Args: {
          p_assignment_type: Database["public"]["Enums"]["custom_form_assignment_type"]
          p_event_id?: string
          p_household_id?: string
          p_student_id?: string
          p_version_id: string
          p_volunteer_profile_id?: string
        }
        Returns: string
      }
      create_custom_form_template: {
        Args: { p_description?: string; p_name: string }
        Returns: string
      }
      create_custom_form_version: {
        Args: {
          p_instructions?: string
          p_template_id: string
          p_title: string
        }
        Returns: string
      }
      create_document_template: {
        Args: {
          p_description: string
          p_document_kind: Database["public"]["Enums"]["document_kind"]
          p_name: string
        }
        Returns: string
      }
      create_document_template_version: {
        Args: {
          p_effective_from?: string
          p_effective_to?: string
          p_explicit_expires_on?: string
          p_template_id: string
          p_valid_for?: string
          p_validity_policy: Database["public"]["Enums"]["document_validity_policy"]
        }
        Returns: string
      }
      create_event: {
        Args: {
          p_address: string
          p_building: string
          p_campus: string
          p_capacity: number
          p_description: string
          p_ends_at: string
          p_event_type: string
          p_meeting_instructions: string
          p_name: string
          p_room: string
          p_starts_at: string
          p_status: Database["public"]["Enums"]["event_status"]
          p_timezone: string
        }
        Returns: string
      }
      create_event_checklist_item: {
        Args: {
          p_due_at: string
          p_event_id: string
          p_notes: string
          p_title: string
        }
        Returns: string
      }
      create_event_participation_override: {
        Args: {
          p_expires_at?: string
          p_reason: string
          p_registration_id: string
          p_unmet_requirement_ids: string[]
        }
        Returns: string
      }
      create_event_reminder: {
        Args: {
          p_event_id: string
          p_notes: string
          p_remind_at: string
          p_title: string
        }
        Returns: string
      }
      create_family: {
        Args: {
          p_address_line_1: string
          p_address_line_2: string
          p_adult_email: string
          p_adult_first_name: string
          p_adult_last_name: string
          p_adult_phone: string
          p_adult_preferred_name: string
          p_city: string
          p_country_code: string
          p_name: string
          p_postal_code: string
          p_receive_email: boolean
          p_receive_emergency_notifications: boolean
          p_receive_sms: boolean
          p_region: string
          p_relationship_label: string
          p_status: Database["public"]["Enums"]["household_status"]
        }
        Returns: string
      }
      create_lesson: {
        Args: {
          p_audience: string
          p_discussion_guide: string
          p_lesson_body: string
          p_preparation_notes: string
          p_scripture_references: string
          p_status: Database["public"]["Enums"]["lesson_status"]
          p_summary: string
          p_teaching_objective: string
          p_title: string
        }
        Returns: string
      }
      create_library_resource: {
        Args: {
          p_audience: Database["public"]["Enums"]["library_resource_audience"]
          p_category_id: string
          p_description: string
          p_resource_type: Database["public"]["Enums"]["library_resource_type"]
          p_title: string
        }
        Returns: string
      }
      create_library_resource_version: {
        Args: {
          p_change_summary?: string
          p_checksum_sha256?: string
          p_content_type: string
          p_file_size_bytes: number
          p_original_file_name: string
          p_resource_id: string
          p_storage_object_path: string
          p_version_id: string
        }
        Returns: number
      }
      create_member_tag: {
        Args: { p_color: string; p_name: string }
        Returns: string
      }
      create_ministry_schedule: {
        Args: {
          p_ends_at: string
          p_event_id: string
          p_ministry_context: string
          p_name: string
          p_notes: string
          p_starts_at: string
          p_timezone: string
        }
        Returns: string
      }
      create_prayer_request: {
        Args: {
          p_assigned_to_profile_id?: string
          p_category_id: string
          p_person_id: string
          p_request_details: string
          p_title: string
          p_visibility?: Database["public"]["Enums"]["prayer_request_visibility"]
        }
        Returns: string
      }
      create_resource_category: {
        Args: { p_description?: string; p_name: string }
        Returns: string
      }
      create_saved_report: {
        Args: { p_configuration: Json; p_name: string; p_report_type: string }
        Returns: string
      }
      create_schedule_rotation: {
        Args: {
          p_ends_at: string
          p_ends_on: string
          p_location_name: string
          p_ministry_context: string
          p_monthly_ordinal: number
          p_name: string
          p_pattern: Database["public"]["Enums"]["schedule_recurrence_pattern"]
          p_profile_id: string
          p_responsibility: string
          p_schedule_name: string
          p_starts_at: string
          p_starts_on: string
          p_timezone: string
          p_weekday: number
        }
        Returns: string
      }
      create_staff_visitor_card: {
        Args: {
          p_email: string
          p_event_id: string
          p_follow_up_email: boolean
          p_follow_up_notes: string
          p_follow_up_phone: boolean
          p_grade_or_age_group: string
          p_guardian_name: string
          p_how_heard: string
          p_invited_by: string
          p_phone: string
          p_visit_date: string
          p_youth_first_name: string
          p_youth_last_name: string
        }
        Returns: string
      }
      create_teaching_resource_file: {
        Args: {
          p_content_type: string
          p_description: string
          p_file_size_bytes: number
          p_lesson_id: string
          p_original_file_name: string
          p_resource_type: Database["public"]["Enums"]["teaching_resource_type"]
          p_storage_object_path: string
          p_teaching_resource_id: string
          p_title: string
        }
        Returns: string
      }
      create_teaching_resource_link: {
        Args: {
          p_description: string
          p_external_url: string
          p_lesson_id: string
          p_resource_type: Database["public"]["Enums"]["teaching_resource_type"]
          p_title: string
        }
        Returns: string
      }
      create_volunteer_skill: {
        Args: { p_description: string; p_name: string }
        Returns: string
      }
      delete_custom_form_field: {
        Args: { p_field_id: string }
        Returns: undefined
      }
      finalize_attendance_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      finalize_document_submission_upload: {
        Args: {
          p_actor_profile_id: string
          p_checksum_sha256: string
          p_content_type: string
          p_file_size_bytes: number
          p_original_file_name: string
          p_submission_id: string
        }
        Returns: undefined
      }
      finalize_document_template_master_upload: {
        Args: {
          p_actor_profile_id: string
          p_checksum_sha256: string
          p_content_type: string
          p_file_size_bytes: number
          p_original_file_name: string
          p_version_id: string
        }
        Returns: undefined
      }
      flag_visitor_card_possible_duplicate: {
        Args: { p_reason: string; p_visitor_card_id: string }
        Returns: undefined
      }
      generate_schedule_rotation: {
        Args: { p_rotation_id: string; p_through: string }
        Returns: number
      }
      get_attendance_visitor_summary: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      get_care_follow_up: {
        Args: { p_care_follow_up_id: string }
        Returns: Json
      }
      get_care_note: { Args: { p_care_note_id: string }; Returns: Json }
      get_checkin_household: {
        Args: { p_event_id: string; p_household_id: string }
        Returns: Json
      }
      get_child_workspace: { Args: { p_student_id: string }; Returns: Json }
      get_curriculum_plan_workspace: {
        Args: { p_curriculum_plan_id: string }
        Returns: Json
      }
      get_custom_form_submission: {
        Args: { p_submission_id: string }
        Returns: Json
      }
      get_event_permission_slip_requirement: {
        Args: { p_event_id: string }
        Returns: Json
      }
      get_event_registration_document_readiness: {
        Args: { p_registration_id: string }
        Returns: Json
      }
      get_event_registration_settings: {
        Args: { p_event_id: string }
        Returns: Json
      }
      get_event_workspace: { Args: { p_event_id: string }; Returns: Json }
      get_family_workspace: { Args: { p_household_id: string }; Returns: Json }
      get_growth_report_summary: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      get_lesson_workspace: { Args: { p_lesson_id: string }; Returns: Json }
      get_my_unread_notification_count: { Args: never; Returns: number }
      get_prayer_request: {
        Args: { p_prayer_request_id: string }
        Returns: Json
      }
      get_reporting_overview: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      get_student_current_medical_form_status: {
        Args: { p_on?: string; p_student_id: string }
        Returns: Json
      }
      get_visitor_card_detail: {
        Args: { p_visitor_card_id: string }
        Returns: Json
      }
      get_volunteer_workspace: { Args: { p_profile_id: string }; Returns: Json }
      grant_sensitive_forms_capability: {
        Args: {
          p_capability: Database["public"]["Enums"]["forms_capability"]
          p_expires_at?: string
          p_profile_id: string
          p_reason: string
        }
        Returns: string
      }
      issue_family_checkin_token: {
        Args: { p_household_id: string }
        Returns: string
      }
      link_parent_account_to_person: {
        Args: {
          p_confirm_relink: boolean
          p_person_id: string
          p_profile_id: string
          p_reason: string
        }
        Returns: undefined
      }
      link_visitor_card_existing: {
        Args: {
          p_link_type: Database["public"]["Enums"]["visitor_card_link_type"]
          p_reason: string
          p_target_id: string
          p_visitor_card_id: string
        }
        Returns: string
      }
      list_accessible_families: {
        Args: { p_search?: string }
        Returns: {
          adult_count: number
          city: string
          household_id: string
          household_name: string
          region: string
          status: Database["public"]["Enums"]["household_status"]
          student_count: number
        }[]
      }
      list_announcements: {
        Args: { p_include_archived?: boolean; p_search?: string }
        Returns: {
          announcement_id: string
          archived_at: string
          audience_type: Database["public"]["Enums"]["communication_audience_type"]
          can_manage: boolean
          created_at: string
          expires_at: string
          message_body: string
          published_at: string
          title: string
          updated_at: string
        }[]
      }
      list_assigned_care_notes: {
        Args: never
        Returns: {
          care_note_id: string
          category_name: string
          created_at: string
          note_content: string
          occurred_at: string
          person_id: string
          person_name: string
          title: string
        }[]
      }
      list_attendance_events: {
        Args: never
        Returns: {
          ends_at: string
          event_id: string
          event_name: string
          event_status: Database["public"]["Enums"]["event_status"]
          starts_at: string
          timezone: string
        }[]
      }
      list_attendance_report_sessions: {
        Args: { p_from_date: string; p_to_date: string }
        Returns: {
          absent_count: number
          class_name: string
          event_name: string
          excused_count: number
          finalized_at: string
          pending_count: number
          present_count: number
          session_date: string
          session_id: string
        }[]
      }
      list_attendance_report_trends: {
        Args: { p_from: string; p_interval?: string; p_to: string }
        Returns: {
          attendance_count: number
          bucket_start: string
          unique_youth: number
        }[]
      }
      list_attendance_roster: {
        Args: { p_search?: string; p_session_id: string }
        Returns: {
          attendance_record_id: string
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          corrected_at: string
          display_name: string
          grade: string
          household_name: string
          notes: string
          student_id: string
          student_status: Database["public"]["Enums"]["student_status"]
        }[]
      }
      list_attendance_sessions: {
        Args: never
        Returns: {
          absent_count: number
          class_name: string
          ends_at: string
          event_id: string
          event_name: string
          excused_count: number
          finalized_at: string
          pending_count: number
          present_count: number
          session_date: string
          session_id: string
          starts_at: string
        }[]
      }
      list_available_child_relationship_adults: {
        Args: { p_student_id: string }
        Returns: {
          display_name: string
          household_relationship: string
          person_id: string
        }[]
      }
      list_available_document_versions: {
        Args: never
        Returns: {
          document_kind: Database["public"]["Enums"]["document_kind"]
          household_id: string
          student_id: string
          student_name: string
          template_name: string
          template_version_id: string
          version_number: number
        }[]
      }
      list_care_categories: {
        Args: { p_include_archived?: boolean }
        Returns: {
          archived_at: string
          can_manage: boolean
          category_id: string
          description: string
          is_active: boolean
          name: string
          sort_order: number
        }[]
      }
      list_care_follow_ups: {
        Args: {
          p_assigned_to_profile_id?: string
          p_include_archived?: boolean
          p_person_id?: string
          p_priority?: Database["public"]["Enums"]["care_follow_up_priority"]
          p_search?: string
          p_status?: Database["public"]["Enums"]["care_follow_up_status"]
        }
        Returns: {
          archived_at: string
          assigned_to_name: string
          assigned_to_profile_id: string
          cancellation_reason: string
          cancelled_at: string
          cancelled_by_name: string
          cancelled_by_profile_id: string
          care_follow_up_id: string
          care_note_id: string
          care_note_title: string
          completed_at: string
          completed_by_name: string
          completed_by_profile_id: string
          completion_notes: string
          created_at: string
          created_by_name: string
          created_by_profile_id: string
          due_at: string
          follow_up_status: Database["public"]["Enums"]["care_follow_up_status"]
          instructions: string
          person_id: string
          person_name: string
          prayer_request_id: string
          prayer_request_title: string
          priority: Database["public"]["Enums"]["care_follow_up_priority"]
          title: string
          updated_at: string
        }[]
      }
      list_care_notes: {
        Args: {
          p_include_archived?: boolean
          p_person_id?: string
          p_search?: string
        }
        Returns: {
          archived_at: string
          care_note_id: string
          category_id: string
          category_name: string
          created_at: string
          created_by_name: string
          created_by_profile_id: string
          note_content: string
          occurred_at: string
          person_id: string
          person_name: string
          title: string
          updated_at: string
        }[]
      }
      list_checked_in_visitors: {
        Args: { p_event_id: string }
        Returns: {
          checked_in_at: string
          display_name: string
          grade: string
          guardian_contact: string
          guardian_name: string
          visitor_id: string
        }[]
      }
      list_checkin_events: {
        Args: never
        Returns: {
          ends_at: string
          event_id: string
          event_name: string
          starts_at: string
          timezone: string
        }[]
      }
      list_checkin_report_events: {
        Args: { p_from_date: string; p_to_date: string }
        Returns: {
          checked_in_count: number
          checked_out_count: number
          event_id: string
          event_name: string
          exception_count: number
          starts_at: string
          visitor_checked_out_count: number
          visitor_count: number
        }[]
      }
      list_communication_history: {
        Args: { p_search?: string }
        Returns: {
          audience_type: Database["public"]["Enums"]["communication_audience_type"]
          channel: Database["public"]["Enums"]["communication_channel"]
          communication_id: string
          communication_status: Database["public"]["Enums"]["communication_status"]
          delivered_count: number
          sent_at: string
          suppressed_count: number
          synthetic_delivery: boolean
          title: string
        }[]
      }
      list_communication_templates: {
        Args: { p_include_archived?: boolean; p_search?: string }
        Returns: {
          archived_at: string
          channel: Database["public"]["Enums"]["communication_channel"]
          message_body: string
          name: string
          subject: string
          template_id: string
          updated_at: string
        }[]
      }
      list_current_medical_form_status: {
        Args: { p_on?: string }
        Returns: {
          household_id: string
          ready: boolean
          school_year_end: string
          school_year_start: string
          state: Json
          student_id: string
          student_name: string
          submission_id: string
          template_version_id: string
        }[]
      }
      list_curriculum_plan_lessons: {
        Args: { p_curriculum_plan_id: string }
        Returns: {
          audience: string
          lesson_id: string
          lesson_status: Database["public"]["Enums"]["lesson_status"]
          lesson_title: string
          plan_lesson_id: string
          scripture_references: string
          sequence_number: number
        }[]
      }
      list_curriculum_plans: {
        Args: {
          p_search?: string
          p_status?: Database["public"]["Enums"]["curriculum_status"]
        }
        Returns: {
          audience: string
          can_manage: boolean
          curriculum_plan_id: string
          curriculum_status: Database["public"]["Enums"]["curriculum_status"]
          ends_on: string
          lesson_count: number
          starts_on: string
          summary: string
          title: string
        }[]
      }
      list_custom_form_assignments: {
        Args: never
        Returns: {
          assigned_at: string
          assignment_id: string
          assignment_type: Database["public"]["Enums"]["custom_form_assignment_type"]
          event_id: string
          household_id: string
          student_id: string
          title: string
          version_id: string
          version_number: number
          volunteer_profile_id: string
        }[]
      }
      list_custom_form_submissions: {
        Args: { p_template_id?: string }
        Returns: {
          assignment_type: Database["public"]["Enums"]["custom_form_assignment_type"]
          subject_household_id: string
          subject_student_id: string
          subject_volunteer_profile_id: string
          submission_id: string
          submission_status: Database["public"]["Enums"]["custom_form_submission_status"]
          submitted_at: string
          submitted_by_profile_id: string
          template_id: string
          title: string
          version_id: string
          version_number: number
        }[]
      }
      list_custom_form_templates: {
        Args: never
        Returns: {
          assignment_count: number
          description: string
          field_count: number
          name: string
          template_id: string
          template_status: Database["public"]["Enums"]["custom_form_status"]
          version_id: string
          version_number: number
          version_status: Database["public"]["Enums"]["custom_form_version_status"]
          version_title: string
        }[]
      }
      list_document_submissions: {
        Args: never
        Returns: {
          digital_status: Database["public"]["Enums"]["document_digital_status"]
          document_kind: Database["public"]["Enums"]["document_kind"]
          expires_on: string
          household_id: string
          is_superseded: boolean
          lifecycle_status: Database["public"]["Enums"]["document_lifecycle_status"]
          medical_verified: boolean
          original_file_name: string
          paper_copy_on_file: boolean
          review_state: Database["public"]["Enums"]["document_review_action"]
          student_id: string
          student_name: string
          submission_id: string
          supersedes_submission_id: string
          template_name: string
          template_version_id: string
          upload_source: Database["public"]["Enums"]["document_upload_source"]
          version_number: number
        }[]
      }
      list_document_template_versions: {
        Args: { p_template_id: string }
        Returns: {
          effective_from: string
          effective_to: string
          explicit_expires_on: string
          file_size_bytes: number
          has_master: boolean
          original_file_name: string
          published_at: string
          status: Database["public"]["Enums"]["document_template_version_status"]
          valid_for: string
          validity_policy: Database["public"]["Enums"]["document_validity_policy"]
          version_id: string
          version_number: number
        }[]
      }
      list_document_templates: {
        Args: never
        Returns: {
          description: string
          document_kind: Database["public"]["Enums"]["document_kind"]
          latest_version_number: number
          name: string
          status: Database["public"]["Enums"]["document_template_status"]
          template_id: string
          version_count: number
        }[]
      }
      list_emergency_roster: {
        Args: { p_event_id: string }
        Returns: {
          check_in_id: string
          checked_in_at: string
          display_name: string
          emergency_contact: string
          household_name: string
          medical_alert: boolean
          student_id: string
        }[]
      }
      list_event_calendar: {
        Args: {
          p_from_date: string
          p_search?: string
          p_status?: Database["public"]["Enums"]["event_status"]
          p_to_date: string
        }
        Returns: {
          building: string
          campus: string
          can_manage: boolean
          capacity: number
          ends_at: string
          event_id: string
          event_name: string
          event_status: Database["public"]["Enums"]["event_status"]
          event_type: string
          room: string
          starts_at: string
          timezone: string
        }[]
      }
      list_event_checklist_items: {
        Args: { p_event_id: string }
        Returns: {
          checklist_item_id: string
          due_at: string
          is_completed: boolean
          notes: string
          sort_order: number
          title: string
        }[]
      }
      list_event_participation_trends: {
        Args: { p_from: string; p_interval?: string; p_to: string }
        Returns: {
          attendance_count: number
          bucket_start: string
          registration_count: number
        }[]
      }
      list_event_registration_document_readiness: {
        Args: { p_event_id: string }
        Returns: {
          documentation_ready: boolean
          event_id: string
          participation_override_id: string
          registration_id: string
          registration_status: Database["public"]["Enums"]["event_registration_status"]
          requirements: Json
          student_id: string
        }[]
      }
      list_event_registrations: {
        Args: { p_event_id: string }
        Returns: {
          created_at: string
          household_name: string
          registration_id: string
          registration_status: Database["public"]["Enums"]["event_registration_status"]
          student_id: string
          student_name: string
          waitlist_position: number
        }[]
      }
      list_event_reminders: {
        Args: { p_event_id: string }
        Returns: {
          notes: string
          remind_at: string
          reminder_id: string
          reminder_status: Database["public"]["Enums"]["event_reminder_status"]
          title: string
        }[]
      }
      list_event_report_summary: {
        Args: { p_from: string; p_to: string }
        Returns: {
          attendance_count: number
          cancelled_count: number
          capacity: number
          capacity_utilization: number
          event_id: string
          event_name: string
          event_type: string
          registered_count: number
          starts_at: string
          volunteer_staffing: number
          waitlisted_count: number
        }[]
      }
      list_event_volunteer_assignments: {
        Args: { p_event_id: string }
        Returns: {
          assignment_ends_at: string
          assignment_id: string
          assignment_role: string
          assignment_starts_at: string
          assignment_status: Database["public"]["Enums"]["volunteer_assignment_status"]
          display_name: string
          profile_id: string
        }[]
      }
      list_event_volunteer_candidates: {
        Args: { p_event_id: string }
        Returns: {
          background_check_status: Database["public"]["Enums"]["background_check_status"]
          display_name: string
          ministry_title: string
          profile_id: string
        }[]
      }
      list_lesson_library: {
        Args: {
          p_search?: string
          p_status?: Database["public"]["Enums"]["lesson_status"]
        }
        Returns: {
          audience: string
          can_manage: boolean
          lesson_id: string
          lesson_status: Database["public"]["Enums"]["lesson_status"]
          scripture_references: string
          summary: string
          title: string
          updated_at: string
        }[]
      }
      list_lesson_teaching_resources: {
        Args: { p_lesson_id: string }
        Returns: {
          content_type: string
          description: string
          external_url: string
          file_size_bytes: number
          has_file: boolean
          original_file_name: string
          resource_type: Database["public"]["Enums"]["teaching_resource_type"]
          teaching_resource_id: string
          title: string
        }[]
      }
      list_library_resource_versions: {
        Args: { p_resource_id: string }
        Returns: {
          change_summary: string
          checksum_sha256: string
          content_type: string
          created_at: string
          created_by_profile_id: string
          file_size_bytes: number
          is_current: boolean
          original_file_name: string
          version_id: string
          version_number: number
        }[]
      }
      list_library_resources: {
        Args: {
          p_audience?: Database["public"]["Enums"]["library_resource_audience"]
          p_category_id?: string
          p_include_archived?: boolean
          p_resource_type?: Database["public"]["Enums"]["library_resource_type"]
          p_search?: string
          p_status?: Database["public"]["Enums"]["library_resource_status"]
        }
        Returns: {
          archived_at: string
          audience: Database["public"]["Enums"]["library_resource_audience"]
          category_id: string
          category_name: string
          content_type: string
          created_at: string
          current_version_id: string
          current_version_number: number
          description: string
          file_size_bytes: number
          original_file_name: string
          published_at: string
          resource_id: string
          resource_status: Database["public"]["Enums"]["library_resource_status"]
          resource_type: Database["public"]["Enums"]["library_resource_type"]
          title: string
          updated_at: string
        }[]
      }
      list_managed_accounts: {
        Args: { p_search?: string }
        Returns: {
          created_at: string
          display_name: string
          email: string
          id: string
          primary_role: Database["public"]["Enums"]["account_role"]
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }[]
      }
      list_member_directory: {
        Args: {
          p_grade?: string
          p_search?: string
          p_status?: Database["public"]["Enums"]["student_status"]
          p_tag_id?: string
        }
        Returns: {
          display_name: string
          grade: string
          household_id: string
          household_name: string
          status: Database["public"]["Enums"]["student_status"]
          student_id: string
          tags: Json
        }[]
      }
      list_ministry_schedules: {
        Args: { p_from: string; p_until: string }
        Returns: {
          assignment_ends_at: string
          assignment_id: string
          assignment_starts_at: string
          assignment_status: Database["public"]["Enums"]["schedule_assignment_status"]
          conflict_codes: string[]
          conflict_overridden: boolean
          ends_at: string
          event_id: string
          location_id: string
          location_name: string
          ministry_context: string
          notes: string
          position_id: string
          profile_id: string
          required_count: number
          responsibility: string
          schedule_id: string
          schedule_name: string
          schedule_status: Database["public"]["Enums"]["ministry_schedule_status"]
          starts_at: string
          timezone: string
          volunteer_name: string
        }[]
      }
      list_my_care_follow_ups: {
        Args: never
        Returns: {
          care_follow_up_id: string
          created_at: string
          due_at: string
          follow_up_status: Database["public"]["Enums"]["care_follow_up_status"]
          instructions: string
          person_id: string
          person_name: string
          priority: Database["public"]["Enums"]["care_follow_up_priority"]
          title: string
        }[]
      }
      list_my_custom_forms: {
        Args: never
        Returns: {
          assigned_at: string
          assignment_id: string
          assignment_type: Database["public"]["Enums"]["custom_form_assignment_type"]
          subject_student_id: string
          submission_id: string
          submission_status: Database["public"]["Enums"]["custom_form_submission_status"]
          title: string
          version_number: number
        }[]
      }
      list_my_event_registration_options: {
        Args: { p_event_id: string }
        Returns: {
          household_id: string
          household_name: string
          registration_id: string
          registration_status: Database["public"]["Enums"]["event_registration_status"]
          student_id: string
          student_name: string
        }[]
      }
      list_my_in_app_notifications: {
        Args: never
        Returns: {
          created_at: string
          message_body: string
          notification_id: string
          read_at: string
          title: string
        }[]
      }
      list_my_saved_reports: {
        Args: never
        Returns: {
          configuration: Json
          created_at: string
          id: string
          name: string
          report_type: string
          updated_at: string
        }[]
      }
      list_parent_account_link_candidates: {
        Args: { p_person_id: string }
        Returns: {
          account_email: string
          account_role: Database["public"]["Enums"]["account_role"]
          account_status: Database["public"]["Enums"]["account_status"]
          display_name: string
          email_matches: boolean
          linked_households: string[]
          linked_person_id: string
          linked_person_name: string
          matching_active_people_count: number
          profile_id: string
        }[]
      }
      list_prayer_care_assignees: {
        Args: never
        Returns: {
          display_name: string
          primary_role: Database["public"]["Enums"]["account_role"]
          profile_id: string
        }[]
      }
      list_prayer_care_people: {
        Args: { p_search?: string }
        Returns: {
          display_name: string
          person_id: string
        }[]
      }
      list_prayer_requests: {
        Args: {
          p_assigned_to_profile_id?: string
          p_include_archived?: boolean
          p_person_id?: string
          p_search?: string
          p_status?: Database["public"]["Enums"]["prayer_request_status"]
        }
        Returns: {
          answer_summary: string
          answered_at: string
          answered_by_name: string
          answered_by_profile_id: string
          archived_at: string
          assigned_to_name: string
          assigned_to_profile_id: string
          category_id: string
          category_name: string
          created_at: string
          person_id: string
          person_name: string
          prayer_request_id: string
          prayer_status: Database["public"]["Enums"]["prayer_request_status"]
          request_details: string
          submitted_by_name: string
          submitted_by_profile_id: string
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["prayer_request_visibility"]
        }[]
      }
      list_public_prayer_summaries: {
        Args: never
        Returns: {
          answered_at: string
          category_name: string
          created_at: string
          prayer_request_id: string
          request_status: Database["public"]["Enums"]["prayer_request_status"]
          title: string
        }[]
      }
      list_resource_categories: {
        Args: { p_include_archived?: boolean }
        Returns: {
          archived_at: string
          category_description: string
          category_id: string
          category_name: string
          created_at: string
          updated_at: string
        }[]
      }
      list_schedulable_events: {
        Args: never
        Returns: {
          ends_at: string
          event_id: string
          event_name: string
          event_status: Database["public"]["Enums"]["event_status"]
          starts_at: string
          timezone: string
        }[]
      }
      list_schedule_assignment_conflict_history: {
        Args: { p_schedule_id: string }
        Returns: {
          assignment_ends_at: string
          assignment_id: string
          assignment_starts_at: string
          assignment_status: Database["public"]["Enums"]["schedule_assignment_status"]
          conflict_codes: string[]
          conflict_overridden: boolean
          location_name: string
          override_reason: string
          position_id: string
          responsibility: string
          volunteer_name: string
        }[]
      }
      list_schedule_locations: {
        Args: { p_schedule_id: string }
        Returns: {
          location_id: string
          location_name: string
        }[]
      }
      list_schedule_rotations: {
        Args: never
        Returns: {
          created_at: string
          created_by_profile_id: string
          ends_at: string
          ends_on: string | null
          id: string
          location_name: string | null
          ministry_context: string | null
          monthly_ordinal: number | null
          name: string
          profile_id: string | null
          recurrence_pattern: Database["public"]["Enums"]["schedule_recurrence_pattern"]
          responsibility: string
          schedule_name: string
          starts_at: string
          starts_on: string
          status: Database["public"]["Enums"]["schedule_rotation_status"]
          timezone: string
          updated_at: string
          weekday: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "schedule_rotations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_scheduling_candidates: {
        Args: never
        Returns: {
          display_name: string
          profile_id: string
        }[]
      }
      list_scheduling_coverage_report: {
        Args: { p_from: string; p_to: string }
        Returns: {
          coverage_percentage: number
          filled_positions: number
          required_positions: number
          schedule_id: string
          schedule_name: string
          schedule_status: string
          starts_at: string
          unfilled_positions: number
        }[]
      }
      list_sensitive_forms_capability_grants: {
        Args: never
        Returns: {
          capability: Database["public"]["Enums"]["forms_capability"]
          expires_at: string
          grant_id: string
          grant_reason: string
          granted_at: string
          granted_by_profile_id: string
          profile_id: string
          revocation_reason: string
          revoked_at: string
          revoked_by_profile_id: string
        }[]
      }
      list_visible_prayer_requests: {
        Args: { p_include_archived?: boolean }
        Returns: {
          answer_summary: string
          assigned_to_profile_id: string
          category_id: string
          category_name: string
          created_at: string
          person_id: string
          person_name: string
          prayer_request_id: string
          request_details: string
          request_status: Database["public"]["Enums"]["prayer_request_status"]
          submitted_by_profile_id: string
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["prayer_request_visibility"]
        }[]
      }
      list_visitor_card_events: {
        Args: never
        Returns: {
          event_id: string
          event_name: string
          starts_at: string
        }[]
      }
      list_visitor_card_possible_matches: {
        Args: { p_visitor_card_id: string }
        Returns: {
          display_name: string
          household_id: string
          match_signals: string[]
          person_id: string
          student_id: string
        }[]
      }
      list_visitor_cards: {
        Args: { p_status?: Database["public"]["Enums"]["visitor_card_status"] }
        Returns: {
          created_at: string
          event_name: string
          follow_up_email: boolean
          follow_up_phone: boolean
          has_email: boolean
          has_phone: boolean
          source: Database["public"]["Enums"]["visitor_card_source"]
          status: Database["public"]["Enums"]["visitor_card_status"]
          visit_date: string
          visitor_card_id: string
          visitor_name: string
        }[]
      }
      list_volunteer_assignment_activity: {
        Args: { p_from: string; p_to: string }
        Returns: {
          assignment_id: string
          assignment_status: string
          event_name: string
          profile_id: string
          responsibility: string
          source: string
          starts_at: string
          volunteer_name: string
        }[]
      }
      list_volunteer_assignments: {
        Args: { p_profile_id: string }
        Returns: {
          assignment_ends_at: string
          assignment_id: string
          assignment_role: string
          assignment_starts_at: string
          assignment_status: Database["public"]["Enums"]["volunteer_assignment_status"]
          event_ends_at: string
          event_id: string
          event_name: string
          event_starts_at: string
          event_status: Database["public"]["Enums"]["event_status"]
          event_timezone: string
        }[]
      }
      list_volunteer_candidates: {
        Args: never
        Returns: {
          display_name: string
          primary_role: Database["public"]["Enums"]["account_role"]
          profile_id: string
        }[]
      }
      list_volunteer_directory: {
        Args: { p_search?: string }
        Returns: {
          background_check_expires_at: string
          background_check_status: Database["public"]["Enums"]["background_check_status"]
          display_name: string
          is_active: boolean
          ministry_title: string
          primary_role: Database["public"]["Enums"]["account_role"]
          profile_id: string
          skills: Json
        }[]
      }
      mark_all_my_notifications_read: { Args: never; Returns: number }
      mark_my_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      open_custom_form_assignment: {
        Args: { p_assignment_id: string; p_subject_student_id?: string }
        Returns: Json
      }
      prepare_document_submission_upload: {
        Args: {
          p_extension: string
          p_object_id: string
          p_student_id: string
          p_supersedes_submission_id?: string
          p_template_version_id: string
        }
        Returns: Json
      }
      prepare_document_template_master_upload: {
        Args: { p_object_id: string; p_version_id: string }
        Returns: Json
      }
      preview_communication_recipients: {
        Args: {
          p_audience_type: Database["public"]["Enums"]["communication_audience_type"]
          p_channel: Database["public"]["Enums"]["communication_channel"]
        }
        Returns: {
          destination_masked: string
          display_name: string
          preference_authorized: boolean
          recipient_profile_id: string
          suppression_reason: string
        }[]
      }
      promote_waitlisted_registration: {
        Args: { p_registration_id: string }
        Returns: undefined
      }
      publish_announcement: {
        Args: { p_announcement_id: string }
        Returns: undefined
      }
      publish_custom_form_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      publish_document_template_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      publish_library_resource: {
        Args: { p_resource_id: string }
        Returns: undefined
      }
      record_reporting_export: {
        Args: {
          p_format: string
          p_from: string
          p_report_type: string
          p_row_count: number
          p_to: string
        }
        Returns: undefined
      }
      record_visitor_card_conversion: {
        Args: {
          p_household_id: string
          p_person_id: string
          p_reason: string
          p_student_id: string
          p_visitor_card_id: string
        }
        Returns: string
      }
      register_my_student_for_event: {
        Args: { p_event_id: string; p_student_id: string }
        Returns: Database["public"]["Enums"]["event_registration_status"]
      }
      reject_document_submission: {
        Args: { p_reason: string; p_submission_id: string }
        Returns: undefined
      }
      list_platform_calendar: {
        Args: { p_from_date: string; p_to_date: string }
        Returns: {
          context: string | null
          ends_at: string
          href: string
          is_personal: boolean
          item_id: string
          item_type: string
          location: string | null
          source_event_id: string | null
          starts_at: string
          status: string
          timezone: string
          title: string
        }[]
      }
      move_curriculum_plan_lesson: {
        Args: { p_direction: string; p_plan_lesson_id: string }
        Returns: number
      }
      remove_lesson_from_curriculum_plan: {
        Args: { p_plan_lesson_id: string }
        Returns: undefined
      }
      rename_saved_report: {
        Args: { p_id: string; p_name: string }
        Returns: undefined
      }
      reopen_visitor_card: {
        Args: { p_reason: string; p_visitor_card_id: string }
        Returns: undefined
      }
      request_document_replacement: {
        Args: { p_reason: string; p_submission_id: string }
        Returns: undefined
      }
      resolve_family_checkin_token: {
        Args: { p_event_id: string; p_token: string }
        Returns: string
      }
      retire_custom_form_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      retire_document_template_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      revoke_document_paper_confirmation: {
        Args: { p_reason: string; p_submission_id: string }
        Returns: undefined
      }
      revoke_event_participation_override: {
        Args: { p_override_id: string; p_reason: string }
        Returns: undefined
      }
      revoke_medical_verification: {
        Args: { p_reason: string; p_submission_id: string }
        Returns: undefined
      }
      revoke_sensitive_forms_capability: {
        Args: { p_grant_id: string; p_reason: string }
        Returns: undefined
      }
      save_attendance_record: {
        Args: {
          p_notes: string
          p_session_id: string
          p_status: Database["public"]["Enums"]["attendance_status"]
          p_student_id: string
        }
        Returns: string
      }
      save_custom_form_answer: {
        Args: {
          p_boolean_value: boolean
          p_choice_value: string
          p_date_value: string
          p_field_id: string
          p_multiple_choice_value: Json
          p_submission_id: string
          p_text_value: string
        }
        Returns: undefined
      }
      save_custom_form_field: {
        Args: {
          p_choice_options: Json
          p_display_order: number
          p_field_id: string
          p_field_key: string
          p_field_type: Database["public"]["Enums"]["custom_form_field_type"]
          p_help_text: string
          p_is_required: boolean
          p_label: string
          p_maximum_date: string
          p_maximum_length: number
          p_minimum_date: string
          p_minimum_length: number
          p_version_id: string
        }
        Returns: string
      }
      save_volunteer_availability: {
        Args: {
          p_day_of_week: number
          p_effective_from: string
          p_effective_until: string
          p_ends_at: string
          p_id: string
          p_notes: string
          p_profile_id: string
          p_starts_at: string
          p_timezone: string
        }
        Returns: string
      }
      save_volunteer_certification: {
        Args: {
          p_expires_at: string
          p_id: string
          p_issued_at: string
          p_issuer: string
          p_name: string
          p_profile_id: string
          p_reference: string
          p_status: Database["public"]["Enums"]["volunteer_certification_status"]
        }
        Returns: string
      }
      save_volunteer_skill_assignment: {
        Args: {
          p_notes: string
          p_profile_id: string
          p_skill_id: string
          p_skill_level: Database["public"]["Enums"]["volunteer_skill_level"]
        }
        Returns: undefined
      }
      schedule_volunteer: {
        Args: {
          p_assignment_role: string
          p_ends_at: string
          p_event_id: string
          p_profile_id: string
          p_starts_at: string
        }
        Returns: string
      }
      search_checkin_households: {
        Args: { p_event_id: string; p_search: string }
        Returns: {
          household_id: string
          household_name: string
          student_count: number
        }[]
      }
      send_synthetic_communication: {
        Args: {
          p_audience_type: Database["public"]["Enums"]["communication_audience_type"]
          p_channel: Database["public"]["Enums"]["communication_channel"]
          p_message_body: string
          p_subject: string
          p_template_id?: string
          p_title: string
        }
        Returns: string
      }
      set_child_tags: {
        Args: { p_student_id: string; p_tag_ids: string[] }
        Returns: undefined
      }
      set_event_checklist_item_completed: {
        Args: { p_checklist_item_id: string; p_is_completed: boolean }
        Returns: undefined
      }
      set_event_permission_slip_requirement: {
        Args: {
          p_event_id: string
          p_required: boolean
          p_template_version_id?: string
        }
        Returns: string
      }
      set_event_reminder_status: {
        Args: {
          p_reminder_id: string
          p_status: Database["public"]["Enums"]["event_reminder_status"]
        }
        Returns: undefined
      }
      set_ministry_schedule_status: {
        Args: {
          p_allow_unfilled?: boolean
          p_schedule_id: string
          p_status: Database["public"]["Enums"]["ministry_schedule_status"]
        }
        Returns: undefined
      }
      set_schedule_rotation_status: {
        Args: {
          p_rotation_id: string
          p_status: Database["public"]["Enums"]["schedule_rotation_status"]
        }
        Returns: undefined
      }
      set_school_year_medical_requirement: {
        Args: { p_school_year_start: string; p_template_version_id: string }
        Returns: string
      }
      set_volunteer_assignment_status: {
        Args: {
          p_assignment_id: string
          p_status: Database["public"]["Enums"]["volunteer_assignment_status"]
        }
        Returns: undefined
      }
      start_visitor_card_conversion: {
        Args: { p_visitor_card_id: string }
        Returns: undefined
      }
      submit_custom_form: {
        Args: { p_submission_id: string }
        Returns: undefined
      }
      update_announcement: {
        Args: {
          p_announcement_id: string
          p_audience_type: Database["public"]["Enums"]["communication_audience_type"]
          p_expires_at?: string
          p_message_body: string
          p_title: string
        }
        Returns: undefined
      }
      update_care_category: {
        Args: {
          p_category_id: string
          p_description?: string
          p_is_active?: boolean
          p_name: string
          p_sort_order?: number
        }
        Returns: undefined
      }
      update_care_follow_up_details: {
        Args: {
          p_assigned_to_profile_id: string
          p_care_follow_up_id: string
          p_due_at: string
          p_instructions: string
          p_person_id: string
          p_priority: Database["public"]["Enums"]["care_follow_up_priority"]
          p_status: Database["public"]["Enums"]["care_follow_up_status"]
          p_title: string
        }
        Returns: undefined
      }
      update_care_follow_up: {
        Args: {
          p_assigned_to_profile_id: string
          p_care_follow_up_id: string
          p_due_at: string
          p_instructions: string
          p_priority: Database["public"]["Enums"]["care_follow_up_priority"]
          p_status: Database["public"]["Enums"]["care_follow_up_status"]
          p_title: string
        }
        Returns: undefined
      }
      update_care_note: {
        Args: {
          p_care_note_id: string
          p_category_id: string
          p_note_content: string
          p_occurred_at: string
          p_title: string
        }
        Returns: undefined
      }
      update_care_note_details: {
        Args: {
          p_care_note_id: string
          p_category_id: string
          p_note_content: string
          p_occurred_at: string
          p_person_id: string
          p_title: string
        }
        Returns: undefined
      }
      update_child_details: {
        Args: {
          p_allergy_summary: string
          p_birth_date: string
          p_dietary_summary: string
          p_first_name: string
          p_grade: string
          p_last_name: string
          p_medical_summary: string
          p_preferred_name: string
          p_status: Database["public"]["Enums"]["student_status"]
          p_student_id: string
        }
        Returns: undefined
      }
      update_child_relationship: {
        Args: {
          p_is_authorized_pickup: boolean
          p_is_emergency_contact: boolean
          p_is_legal_guardian: boolean
          p_may_sign_permission_forms: boolean
          p_may_view_student_information: boolean
          p_person_id: string
          p_receive_email: boolean
          p_receive_sms: boolean
          p_relationship_type: string
          p_student_id: string
        }
        Returns: undefined
      }
      update_communication_template: {
        Args: {
          p_channel: Database["public"]["Enums"]["communication_channel"]
          p_message_body: string
          p_name: string
          p_subject: string
          p_template_id: string
        }
        Returns: undefined
      }
      update_curriculum_plan: {
        Args: {
          p_audience: string
          p_curriculum_plan_id: string
          p_ends_on: string
          p_starts_on: string
          p_status: Database["public"]["Enums"]["curriculum_status"]
          p_summary: string
          p_title: string
        }
        Returns: undefined
      }
      update_custom_form_version_draft: {
        Args: { p_instructions?: string; p_title: string; p_version_id: string }
        Returns: undefined
      }
      update_document_template_version_draft: {
        Args: {
          p_effective_from?: string
          p_effective_to?: string
          p_explicit_expires_on?: string
          p_valid_for?: string
          p_validity_policy: Database["public"]["Enums"]["document_validity_policy"]
          p_version_id: string
        }
        Returns: undefined
      }
      update_event: {
        Args: {
          p_address: string
          p_building: string
          p_campus: string
          p_capacity: number
          p_description: string
          p_ends_at: string
          p_event_id: string
          p_event_type: string
          p_meeting_instructions: string
          p_name: string
          p_room: string
          p_starts_at: string
          p_status: Database["public"]["Enums"]["event_status"]
          p_timezone: string
        }
        Returns: undefined
      }
      update_event_registration_settings: {
        Args: {
          p_capacity: number
          p_event_id: string
          p_registration_closes_at: string
          p_registration_opens_at: string
          p_waitlist_capacity: number
        }
        Returns: undefined
      }
      update_family_adult: {
        Args: {
          p_email: string
          p_first_name: string
          p_household_id: string
          p_is_primary_contact: boolean
          p_is_responsible_adult: boolean
          p_last_name: string
          p_person_id: string
          p_phone: string
          p_preferred_name: string
          p_receive_email: boolean
          p_receive_emergency_notifications: boolean
          p_receive_sms: boolean
          p_relationship_label: string
        }
        Returns: undefined
      }
      update_family_details: {
        Args: {
          p_address_line_1: string
          p_address_line_2: string
          p_city: string
          p_country_code: string
          p_household_id: string
          p_name: string
          p_postal_code: string
          p_region: string
          p_status: Database["public"]["Enums"]["household_status"]
        }
        Returns: undefined
      }
      update_lesson: {
        Args: {
          p_audience: string
          p_discussion_guide: string
          p_lesson_body: string
          p_lesson_id: string
          p_preparation_notes: string
          p_scripture_references: string
          p_status: Database["public"]["Enums"]["lesson_status"]
          p_summary: string
          p_teaching_objective: string
          p_title: string
        }
        Returns: undefined
      }
      update_library_resource: {
        Args: {
          p_audience: Database["public"]["Enums"]["library_resource_audience"]
          p_category_id: string
          p_description: string
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["library_resource_type"]
          p_title: string
        }
        Returns: undefined
      }
      update_own_profile: {
        Args: { p_display_name: string }
        Returns: undefined
      }
      update_prayer_request: {
        Args: {
          p_category_id: string | null
          p_person_id: string
          p_prayer_request_id: string
          p_request_details: string
          p_title: string
          p_visibility: Database["public"]["Enums"]["prayer_request_visibility"]
        }
        Returns: undefined
      }
      update_resource_category: {
        Args: { p_category_id: string; p_description?: string; p_name: string }
        Returns: undefined
      }
      upsert_volunteer_profile: {
        Args: {
          p_background_check_completed_at: string
          p_background_check_expires_at: string
          p_background_check_reference: string
          p_background_check_status: Database["public"]["Enums"]["background_check_status"]
          p_is_active: boolean
          p_ministry_title: string
          p_profile_id: string
        }
        Returns: undefined
      }
      verify_medical_document: {
        Args: { p_reason?: string; p_submission_id: string }
        Returns: undefined
      }
    }
    Enums: {
      account_role:
        | "platform_administrator"
        | "youth_pastor"
        | "staff_member"
        | "volunteer"
        | "parent"
      account_status:
        | "invited"
        | "active"
        | "suspended"
        | "disabled"
        | "archived"
      attendance_status: "pending" | "present" | "absent" | "excused"
      audit_result: "success" | "failure" | "denied"
      audit_source: "web" | "api" | "system" | "migration"
      background_check_status:
        | "not_required"
        | "pending"
        | "cleared"
        | "review_required"
        | "expired"
      care_follow_up_priority: "low" | "normal" | "high" | "urgent"
      care_follow_up_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
      check_in_status: "expected" | "checked_in" | "checked_out" | "exception"
      communication_audience_type:
        | "ministry"
        | "parents"
        | "volunteers"
        | "household"
        | "event"
        | "individual"
      communication_channel: "in_app" | "email" | "sms"
      communication_delivery_status:
        | "pending"
        | "sent"
        | "delivered"
        | "failed"
        | "suppressed"
      communication_status:
        | "draft"
        | "scheduled"
        | "sending"
        | "delivered"
        | "failed"
        | "cancelled"
      curriculum_status: "draft" | "published" | "completed" | "archived"
      custom_form_assignment_type:
        | "event"
        | "student"
        | "household"
        | "volunteer"
        | "general_ministry"
      custom_form_field_type:
        | "short_text"
        | "long_text"
        | "yes_no"
        | "single_choice"
        | "multiple_choice"
        | "date"
        | "acknowledgment"
      custom_form_status: "draft" | "active" | "archived"
      custom_form_submission_status: "draft" | "submitted" | "archived"
      custom_form_version_status: "draft" | "published" | "retired"
      document_digital_status:
        | "missing"
        | "uploaded"
        | "accepted"
        | "needs_replacement"
      document_kind: "permission_slip" | "medical_release"
      document_lifecycle_status:
        | "digital_received"
        | "paper_required"
        | "under_review"
        | "complete"
        | "rejected"
        | "expired"
        | "superseded"
        | "archived"
      document_review_action:
        | "accepted"
        | "rejected"
        | "replacement_requested"
        | "medical_verified"
        | "medical_verification_revoked"
      document_template_status: "draft" | "active" | "archived"
      document_template_version_status: "draft" | "published" | "retired"
      document_upload_source: "parent" | "staff"
      document_validity_policy:
        | "event_specific"
        | "fixed_interval"
        | "explicit_expiration"
      event_registration_status:
        | "draft"
        | "registered"
        | "waitlisted"
        | "confirmed"
        | "cancelled"
        | "completed"
      event_reminder_status: "scheduled" | "completed" | "cancelled"
      event_status: "draft" | "published" | "active" | "completed" | "archived"
      forms_capability:
        | "forms.documents.manage"
        | "forms.documents.paper_confirm"
        | "forms.medical.view"
        | "forms.medical.verify"
        | "forms.participation.override"
        | "custom_forms.manage"
        | "custom_forms.submit"
        | "visitor_cards.manage"
      household_status: "prospect" | "active" | "inactive" | "archived"
      lesson_status: "draft" | "published" | "archived"
      library_resource_audience:
        | "ministry"
        | "volunteer"
        | "family"
        | "all_authenticated"
      library_resource_status: "draft" | "published" | "archived"
      library_resource_type: "document" | "image" | "video" | "other"
      ministry_schedule_status:
        | "draft"
        | "published"
        | "cancelled"
        | "completed"
      paper_evidence_action: "confirmed_on_file" | "confirmation_revoked"
      person_status: "active" | "inactive" | "archived"
      prayer_request_status: "active" | "answered" | "archived"
      prayer_request_visibility: "public" | "leadership" | "private"
      schedule_assignment_status:
        | "assigned"
        | "confirmed"
        | "declined"
        | "cancelled"
      schedule_recurrence_pattern: "weekly" | "biweekly" | "monthly"
      schedule_rotation_status: "active" | "paused" | "ended"
      student_status:
        | "prospective"
        | "registered"
        | "active"
        | "inactive"
        | "archived"
      teaching_resource_type: "document" | "pdf" | "video" | "link" | "other"
      visitor_card_link_type: "person" | "student" | "household" | "conversion"
      visitor_card_review_action:
        | "review_started"
        | "duplicate_flagged"
        | "duplicate_cleared"
        | "closed"
        | "reopened"
        | "archived"
      visitor_card_source: "staff" | "self_service"
      visitor_card_status:
        | "new"
        | "under_review"
        | "possible_duplicate"
        | "linked_existing"
        | "conversion_started"
        | "converted"
        | "closed"
        | "archived"
      visitor_check_in_status: "checked_in" | "checked_out"
      volunteer_assignment_status:
        | "assigned"
        | "confirmed"
        | "declined"
        | "cancelled"
        | "completed"
      volunteer_certification_status: "active" | "expired" | "revoked"
      volunteer_skill_level:
        | "interested"
        | "beginner"
        | "proficient"
        | "advanced"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_role: [
        "platform_administrator",
        "youth_pastor",
        "staff_member",
        "volunteer",
        "parent",
      ],
      account_status: [
        "invited",
        "active",
        "suspended",
        "disabled",
        "archived",
      ],
      attendance_status: ["pending", "present", "absent", "excused"],
      audit_result: ["success", "failure", "denied"],
      audit_source: ["web", "api", "system", "migration"],
      background_check_status: [
        "not_required",
        "pending",
        "cleared",
        "review_required",
        "expired",
      ],
      care_follow_up_priority: ["low", "normal", "high", "urgent"],
      care_follow_up_status: [
        "pending",
        "in_progress",
        "completed",
        "cancelled",
      ],
      check_in_status: ["expected", "checked_in", "checked_out", "exception"],
      communication_audience_type: [
        "ministry",
        "parents",
        "volunteers",
        "household",
        "event",
        "individual",
      ],
      communication_channel: ["in_app", "email", "sms"],
      communication_delivery_status: [
        "pending",
        "sent",
        "delivered",
        "failed",
        "suppressed",
      ],
      communication_status: [
        "draft",
        "scheduled",
        "sending",
        "delivered",
        "failed",
        "cancelled",
      ],
      curriculum_status: ["draft", "published", "completed", "archived"],
      custom_form_assignment_type: [
        "event",
        "student",
        "household",
        "volunteer",
        "general_ministry",
      ],
      custom_form_field_type: [
        "short_text",
        "long_text",
        "yes_no",
        "single_choice",
        "multiple_choice",
        "date",
        "acknowledgment",
      ],
      custom_form_status: ["draft", "active", "archived"],
      custom_form_submission_status: ["draft", "submitted", "archived"],
      custom_form_version_status: ["draft", "published", "retired"],
      document_digital_status: [
        "missing",
        "uploaded",
        "accepted",
        "needs_replacement",
      ],
      document_kind: ["permission_slip", "medical_release"],
      document_lifecycle_status: [
        "digital_received",
        "paper_required",
        "under_review",
        "complete",
        "rejected",
        "expired",
        "superseded",
        "archived",
      ],
      document_review_action: [
        "accepted",
        "rejected",
        "replacement_requested",
        "medical_verified",
        "medical_verification_revoked",
      ],
      document_template_status: ["draft", "active", "archived"],
      document_template_version_status: ["draft", "published", "retired"],
      document_upload_source: ["parent", "staff"],
      document_validity_policy: [
        "event_specific",
        "fixed_interval",
        "explicit_expiration",
      ],
      event_registration_status: [
        "draft",
        "registered",
        "waitlisted",
        "confirmed",
        "cancelled",
        "completed",
      ],
      event_reminder_status: ["scheduled", "completed", "cancelled"],
      event_status: ["draft", "published", "active", "completed", "archived"],
      forms_capability: [
        "forms.documents.manage",
        "forms.documents.paper_confirm",
        "forms.medical.view",
        "forms.medical.verify",
        "forms.participation.override",
        "custom_forms.manage",
        "custom_forms.submit",
        "visitor_cards.manage",
      ],
      household_status: ["prospect", "active", "inactive", "archived"],
      lesson_status: ["draft", "published", "archived"],
      library_resource_audience: [
        "ministry",
        "volunteer",
        "family",
        "all_authenticated",
      ],
      library_resource_status: ["draft", "published", "archived"],
      library_resource_type: ["document", "image", "video", "other"],
      ministry_schedule_status: [
        "draft",
        "published",
        "cancelled",
        "completed",
      ],
      paper_evidence_action: ["confirmed_on_file", "confirmation_revoked"],
      person_status: ["active", "inactive", "archived"],
      prayer_request_status: ["active", "answered", "archived"],
      prayer_request_visibility: ["public", "leadership", "private"],
      schedule_assignment_status: [
        "assigned",
        "confirmed",
        "declined",
        "cancelled",
      ],
      schedule_recurrence_pattern: ["weekly", "biweekly", "monthly"],
      schedule_rotation_status: ["active", "paused", "ended"],
      student_status: [
        "prospective",
        "registered",
        "active",
        "inactive",
        "archived",
      ],
      teaching_resource_type: ["document", "pdf", "video", "link", "other"],
      visitor_card_link_type: ["person", "student", "household", "conversion"],
      visitor_card_review_action: [
        "review_started",
        "duplicate_flagged",
        "duplicate_cleared",
        "closed",
        "reopened",
        "archived",
      ],
      visitor_card_source: ["staff", "self_service"],
      visitor_card_status: [
        "new",
        "under_review",
        "possible_duplicate",
        "linked_existing",
        "conversion_started",
        "converted",
        "closed",
        "archived",
      ],
      visitor_check_in_status: ["checked_in", "checked_out"],
      volunteer_assignment_status: [
        "assigned",
        "confirmed",
        "declined",
        "cancelled",
        "completed",
      ],
      volunteer_certification_status: ["active", "expired", "revoked"],
      volunteer_skill_level: [
        "interested",
        "beginner",
        "proficient",
        "advanced",
      ],
    },
  },
} as const

type NullableRpcArgs<T> = T extends Record<string, unknown>
  ? { [K in keyof T]: T[K] | null }
  : T;

type ApplicationFunctions = {
  [K in keyof Database["public"]["Functions"]]:
    Database["public"]["Functions"][K] extends {
      Args: infer A;
      Returns: infer R;
    }
      ? Omit<Database["public"]["Functions"][K], "Args"> & {
          Args: NullableRpcArgs<A>;
          Returns: R;
        }
      : Database["public"]["Functions"][K];
};

export type ApplicationDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: ApplicationFunctions;
  };
};

export type AccountRole = Database["public"]["Enums"]["account_role"];
export type AccountStatus = Database["public"]["Enums"]["account_status"];
export type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];
export type AuditResult = Database["public"]["Enums"]["audit_result"];
export type AuditSource = Database["public"]["Enums"]["audit_source"];
export type BackgroundCheckStatus = Database["public"]["Enums"]["background_check_status"];
export type CareFollowUpPriority = Database["public"]["Enums"]["care_follow_up_priority"];
export type CareFollowUpStatus = Database["public"]["Enums"]["care_follow_up_status"];
export type CheckInStatus = Database["public"]["Enums"]["check_in_status"];
export type CommunicationAudienceType = Database["public"]["Enums"]["communication_audience_type"];
export type CommunicationChannel = Database["public"]["Enums"]["communication_channel"];
export type CommunicationDeliveryStatus = Database["public"]["Enums"]["communication_delivery_status"];
export type CommunicationStatus = Database["public"]["Enums"]["communication_status"];
export type CurriculumStatus = Database["public"]["Enums"]["curriculum_status"];
export type CustomFormAssignmentType = Database["public"]["Enums"]["custom_form_assignment_type"];
export type CustomFormFieldType = Database["public"]["Enums"]["custom_form_field_type"];
export type CustomFormStatus = Database["public"]["Enums"]["custom_form_status"];
export type CustomFormSubmissionStatus = Database["public"]["Enums"]["custom_form_submission_status"];
export type CustomFormVersionStatus = Database["public"]["Enums"]["custom_form_version_status"];
export type DocumentDigitalStatus = Database["public"]["Enums"]["document_digital_status"];
export type DocumentKind = Database["public"]["Enums"]["document_kind"];
export type DocumentLifecycleStatus = Database["public"]["Enums"]["document_lifecycle_status"];
export type DocumentReviewAction = Database["public"]["Enums"]["document_review_action"];
export type DocumentTemplateStatus = Database["public"]["Enums"]["document_template_status"];
export type DocumentTemplateVersionStatus = Database["public"]["Enums"]["document_template_version_status"];
export type DocumentUploadSource = Database["public"]["Enums"]["document_upload_source"];
export type DocumentValidityPolicy = Database["public"]["Enums"]["document_validity_policy"];
export type EventRegistrationStatus = Database["public"]["Enums"]["event_registration_status"];
export type EventReminderStatus = Database["public"]["Enums"]["event_reminder_status"];
export type EventStatus = Database["public"]["Enums"]["event_status"];
export type FormsCapability = Database["public"]["Enums"]["forms_capability"];
export type HouseholdStatus = Database["public"]["Enums"]["household_status"];
export type LessonStatus = Database["public"]["Enums"]["lesson_status"];
export type LibraryResourceAudience = Database["public"]["Enums"]["library_resource_audience"];
export type LibraryResourceStatus = Database["public"]["Enums"]["library_resource_status"];
export type LibraryResourceType = Database["public"]["Enums"]["library_resource_type"];
export type MinistryScheduleStatus = Database["public"]["Enums"]["ministry_schedule_status"];
export type PaperEvidenceAction = Database["public"]["Enums"]["paper_evidence_action"];
export type PersonStatus = Database["public"]["Enums"]["person_status"];
export type PrayerRequestStatus = Database["public"]["Enums"]["prayer_request_status"];
export type PrayerRequestVisibility = Database["public"]["Enums"]["prayer_request_visibility"];
export type ScheduleAssignmentStatus = Database["public"]["Enums"]["schedule_assignment_status"];
export type ScheduleRecurrencePattern = Database["public"]["Enums"]["schedule_recurrence_pattern"];
export type ScheduleRotationStatus = Database["public"]["Enums"]["schedule_rotation_status"];
export type StudentStatus = Database["public"]["Enums"]["student_status"];
export type TeachingResourceType = Database["public"]["Enums"]["teaching_resource_type"];
export type VisitorCardLinkType = Database["public"]["Enums"]["visitor_card_link_type"];
export type VisitorCardReviewAction = Database["public"]["Enums"]["visitor_card_review_action"];
export type VisitorCardSource = Database["public"]["Enums"]["visitor_card_source"];
export type VisitorCardStatus = Database["public"]["Enums"]["visitor_card_status"];
export type VisitorCheckInStatus = Database["public"]["Enums"]["visitor_check_in_status"];
export type VolunteerAssignmentStatus = Database["public"]["Enums"]["volunteer_assignment_status"];
export type VolunteerCertificationStatus = Database["public"]["Enums"]["volunteer_certification_status"];
export type VolunteerSkillLevel = Database["public"]["Enums"]["volunteer_skill_level"];

// Native Group Chat Phase 1A is intentionally unapplied. These repository-side
// definitions document the pending migration contract until linked-project type
// regeneration can replace them after an approved database application.
export type ChatRoomType =
  | "ministry"
  | "event"
  | "volunteer_team"
  | "staff_leadership"
  | "parent"
  | "custom";
export type ChatSourceAccess =
  | "explicit"
  | "event_parents"
  | "event_volunteers"
  | "schedule_volunteers";
export type ChatMembershipSource = "explicit" | "event" | "schedule";

export type ChatRoomRow = {
  archived_at: string | null;
  archived_by_profile_id: string | null;
  created_at: string;
  created_by_profile_id: string;
  event_id: string | null;
  id: string;
  name: string;
  room_type: ChatRoomType;
  schedule_id: string | null;
  source_access: ChatSourceAccess;
  updated_at: string;
};

export type ChatRoomMemberRow = {
  added_by_profile_id: string;
  id: string;
  joined_at: string;
  membership_source: ChatMembershipSource;
  profile_id: string;
  removal_reason: string | null;
  removed_at: string | null;
  removed_by_profile_id: string | null;
  room_id: string;
};

export type ChatMessageRow = {
  author_profile_id: string;
  created_at: string;
  id: string;
  message_body: string;
  removal_reason: string | null;
  removed_at: string | null;
  removed_by_profile_id: string | null;
  reply_to_message_id: string | null;
  room_id: string;
};

export type ChatReadStateRow = {
  last_read_at: string;
  last_read_message_id: string | null;
  profile_id: string;
  room_id: string;
  updated_at: string;
};

export type NativeGroupChatFunctions = {
  add_chat_room_member: { Args: { p_profile_id: string; p_room_id: string }; Returns: string };
  archive_chat_room: { Args: { p_room_id: string }; Returns: undefined };
  create_chat_room: {
    Args: {
      p_event_id?: string | null;
      p_name: string;
      p_room_type: ChatRoomType;
      p_schedule_id?: string | null;
      p_source_access?: ChatSourceAccess;
    };
    Returns: string;
  };
  get_chat_room: { Args: { p_room_id: string }; Returns: Json };
  list_chat_member_candidates: {
    Args: { p_room_id: string };
    Returns: { display_name: string; is_member: boolean; primary_role: AccountRole; profile_id: string }[];
  };
  list_chat_messages: {
    Args: { p_before?: string | null; p_limit?: number; p_room_id: string };
    Returns: {
      author_name: string;
      author_profile_id: string;
      can_moderate: boolean;
      created_at: string;
      message_body: string | null;
      message_id: string;
      removed_at: string | null;
      reply_author_name: string | null;
      reply_message_body: string | null;
      reply_to_message_id: string | null;
    }[];
  };
  list_chat_rooms: {
    Args: Record<PropertyKey, never>;
    Returns: {
      archived_at: string | null;
      can_manage: boolean;
      event_id: string | null;
      last_message_at: string | null;
      room_id: string;
      room_name: string;
      room_type: ChatRoomType;
      schedule_id: string | null;
      source_access: ChatSourceAccess;
      unread_count: number;
    }[];
  };
  mark_chat_room_read: { Args: { p_message_id: string; p_room_id: string }; Returns: undefined };
  remove_chat_message: { Args: { p_message_id: string; p_reason: string }; Returns: undefined };
  remove_chat_room_member: { Args: { p_profile_id: string; p_reason: string; p_room_id: string }; Returns: undefined };
  rename_chat_room: { Args: { p_name: string; p_room_id: string }; Returns: undefined };
  send_chat_message: {
    Args: { p_message_body: string; p_reply_to_message_id?: string | null; p_room_id: string };
    Returns: string;
  };
};
