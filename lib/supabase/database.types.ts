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
          created_by_profile_id: string
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
          created_by_profile_id: string
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
          created_by_profile_id?: string
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
      archive_event: { Args: { p_event_id: string }; Returns: undefined }
      archive_lesson: { Args: { p_lesson_id: string }; Returns: undefined }
      archive_prayer_request: {
        Args: { p_prayer_request_id: string }
        Returns: undefined
      }
      archive_teaching_resource: {
        Args: { p_teaching_resource_id: string }
        Returns: undefined
      }
      assign_prayer_request: {
        Args: { p_assigned_to_profile_id: string; p_prayer_request_id: string }
        Returns: undefined
      }
      authorize_curriculum_resource_download: {
        Args: { p_teaching_resource_id: string }
        Returns: Json
      }
      cancel_care_follow_up: {
        Args: { p_cancellation_reason: string; p_care_follow_up_id: string }
        Returns: undefined
      }
      cancel_my_event_registration: {
        Args: { p_registration_id: string }
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
      complete_care_follow_up: {
        Args: { p_care_follow_up_id: string; p_completion_notes?: string }
        Returns: undefined
      }
      correct_student_check_in: {
        Args: { p_event_id: string; p_reason: string; p_student_id: string }
        Returns: undefined
      }
      create_announcement: {
        Args: {
          p_audience_type: Database["public"]["Enums"]["communication_audience_type"]
          p_expires_at?: string | null
          p_message_body: string
          p_title: string
        }
        Returns: string
      }
      create_attendance_session: {
        Args: {
          p_class_name: string
          p_ends_at: string | null
          p_event_id: string
          p_session_date: string
          p_starts_at: string | null
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
          p_subject: string | null
        }
        Returns: string
      }
      create_curriculum_plan: {
        Args: {
          p_audience: string | null
          p_ends_on: string | null
          p_starts_on: string | null
          p_status: Database["public"]["Enums"]["curriculum_status"]
          p_summary: string | null
          p_title: string
        }
        Returns: string
      }
      create_event: {
        Args: {
          p_address: string | null
          p_building: string | null
          p_campus: string | null
          p_capacity: number | null
          p_description: string | null
          p_ends_at: string
          p_event_type: string
          p_meeting_instructions: string | null
          p_name: string
          p_room: string | null
          p_starts_at: string
          p_status: Database["public"]["Enums"]["event_status"]
          p_timezone: string
        }
        Returns: string
      }
      create_event_checklist_item: {
        Args: {
          p_due_at: string | null
          p_event_id: string
          p_notes: string | null
          p_title: string
        }
        Returns: string
      }
      create_event_reminder: {
        Args: {
          p_event_id: string
          p_notes: string | null
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
          p_audience: string | null
          p_discussion_guide: string | null
          p_lesson_body: string | null
          p_preparation_notes: string | null
          p_scripture_references: string | null
          p_status: Database["public"]["Enums"]["lesson_status"]
          p_summary: string | null
          p_teaching_objective: string | null
          p_title: string
        }
        Returns: string
      }
      create_member_tag: {
        Args: { p_color: string; p_name: string }
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
      create_teaching_resource_file: {
        Args: {
          p_content_type: string
          p_description: string | null
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
          p_description: string | null
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
      finalize_attendance_session: {
        Args: { p_session_id: string }
        Returns: undefined
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
      get_event_registration_settings: {
        Args: { p_event_id: string }
        Returns: Json
      }
      get_event_workspace: { Args: { p_event_id: string }; Returns: Json }
      get_family_workspace: { Args: { p_household_id: string }; Returns: Json }
      get_lesson_workspace: { Args: { p_lesson_id: string }; Returns: Json }
      get_my_unread_notification_count: { Args: never; Returns: number }
      get_prayer_request: {
        Args: { p_prayer_request_id: string }
        Returns: Json
      }
      get_volunteer_workspace: { Args: { p_profile_id: string }; Returns: Json }
      issue_family_checkin_token: {
        Args: { p_household_id: string }
        Returns: string
      }
      list_accessible_families: {
        Args: { p_search?: string | null }
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
        Args: { p_include_archived?: boolean; p_search?: string | null }
        Returns: {
          announcement_id: string
          archived_at: string
          audience_type: Database["public"]["Enums"]["communication_audience_type"]
          can_manage: boolean
          expires_at: string
          message_body: string
          published_at: string
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
      list_attendance_roster: {
        Args: { p_search?: string | null; p_session_id: string }
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
        Args: { p_search?: string | null }
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
        Args: { p_include_archived?: boolean; p_search?: string | null }
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
          p_search?: string | null
          p_status?: Database["public"]["Enums"]["curriculum_status"] | null
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
          p_search?: string | null
          p_status?: Database["public"]["Enums"]["event_status"] | null
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
          p_search?: string | null
          p_status?: Database["public"]["Enums"]["lesson_status"] | null
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
      list_managed_accounts: {
        Args: { p_search?: string | null }
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
        Args: { p_search?: string | null }
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
      register_my_student_for_event: {
        Args: { p_event_id: string; p_student_id: string }
        Returns: Database["public"]["Enums"]["event_registration_status"]
      }
      remove_lesson_from_curriculum_plan: {
        Args: { p_plan_lesson_id: string }
        Returns: undefined
      }
      resolve_family_checkin_token: {
        Args: { p_event_id: string; p_token: string }
        Returns: string
      }
      save_attendance_record: {
        Args: {
          p_notes: string | null
          p_session_id: string
          p_status: Database["public"]["Enums"]["attendance_status"]
          p_student_id: string
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
          p_subject: string | null
          p_template_id?: string | null
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
      set_event_reminder_status: {
        Args: {
          p_reminder_id: string
          p_status: Database["public"]["Enums"]["event_reminder_status"]
        }
        Returns: undefined
      }
      set_volunteer_assignment_status: {
        Args: {
          p_assignment_id: string
          p_status: Database["public"]["Enums"]["volunteer_assignment_status"]
        }
        Returns: undefined
      }
      update_announcement: {
        Args: {
          p_announcement_id: string
          p_audience_type: Database["public"]["Enums"]["communication_audience_type"]
          p_expires_at?: string | null
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
          p_subject: string | null
          p_template_id: string
        }
        Returns: undefined
      }
      update_curriculum_plan: {
        Args: {
          p_audience: string | null
          p_curriculum_plan_id: string
          p_ends_on: string | null
          p_starts_on: string | null
          p_status: Database["public"]["Enums"]["curriculum_status"]
          p_summary: string | null
          p_title: string
        }
        Returns: undefined
      }
      update_event: {
        Args: {
          p_address: string | null
          p_building: string | null
          p_campus: string | null
          p_capacity: number | null
          p_description: string | null
          p_ends_at: string
          p_event_id: string
          p_event_type: string
          p_meeting_instructions: string | null
          p_name: string
          p_room: string | null
          p_starts_at: string
          p_status: Database["public"]["Enums"]["event_status"]
          p_timezone: string
        }
        Returns: undefined
      }
      update_event_registration_settings: {
        Args: {
          p_capacity: number | null
          p_event_id: string
          p_registration_closes_at: string | null
          p_registration_opens_at: string | null
          p_waitlist_capacity: number | null
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
          p_audience: string | null
          p_discussion_guide: string | null
          p_lesson_body: string | null
          p_lesson_id: string
          p_preparation_notes: string | null
          p_scripture_references: string | null
          p_status: Database["public"]["Enums"]["lesson_status"]
          p_summary: string | null
          p_teaching_objective: string | null
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
          p_category_id: string
          p_prayer_request_id: string
          p_request_details: string
          p_title: string
          p_visibility: Database["public"]["Enums"]["prayer_request_visibility"]
        }
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
      event_registration_status:
        | "draft"
        | "registered"
        | "waitlisted"
        | "confirmed"
        | "cancelled"
        | "completed"
      event_reminder_status: "scheduled" | "completed" | "cancelled"
      event_status: "draft" | "published" | "active" | "completed" | "archived"
      household_status: "prospect" | "active" | "inactive" | "archived"
      lesson_status: "draft" | "published" | "archived"
      person_status: "active" | "inactive" | "archived"
      prayer_request_status: "active" | "answered" | "archived"
      prayer_request_visibility: "public" | "leadership" | "private"
      student_status:
        | "prospective"
        | "registered"
        | "active"
        | "inactive"
        | "archived"
      teaching_resource_type: "document" | "pdf" | "video" | "link" | "other"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      household_status: ["prospect", "active", "inactive", "archived"],
      lesson_status: ["draft", "published", "archived"],
      person_status: ["active", "inactive", "archived"],
      prayer_request_status: ["active", "answered", "archived"],
      prayer_request_visibility: ["public", "leadership", "private"],
      student_status: [
        "prospective",
        "registered",
        "active",
        "inactive",
        "archived",
      ],
      teaching_resource_type: ["document", "pdf", "video", "link", "other"],
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

// Application-facing aliases. Supabase CLI regeneration preserves the enum
// definitions above but does not emit the PascalCase names used throughout
// the feature modules.
export type AccountRole = Database["public"]["Enums"]["account_role"]
export type AccountStatus = Database["public"]["Enums"]["account_status"]
export type AttendanceStatus =
  Database["public"]["Enums"]["attendance_status"]
export type AuditResult = Database["public"]["Enums"]["audit_result"]
export type AuditSource = Database["public"]["Enums"]["audit_source"]
export type BackgroundCheckStatus =
  Database["public"]["Enums"]["background_check_status"]
export type CareFollowUpPriority =
  Database["public"]["Enums"]["care_follow_up_priority"]
export type CareFollowUpStatus =
  Database["public"]["Enums"]["care_follow_up_status"]
export type CheckInStatus = Database["public"]["Enums"]["check_in_status"]
export type CommunicationAudienceType =
  Database["public"]["Enums"]["communication_audience_type"]
export type CommunicationChannel =
  Database["public"]["Enums"]["communication_channel"]
export type CommunicationDeliveryStatus =
  Database["public"]["Enums"]["communication_delivery_status"]
export type CommunicationStatus =
  Database["public"]["Enums"]["communication_status"]
export type CurriculumStatus =
  Database["public"]["Enums"]["curriculum_status"]
export type EventRegistrationStatus =
  Database["public"]["Enums"]["event_registration_status"]
export type EventReminderStatus =
  Database["public"]["Enums"]["event_reminder_status"]
export type EventStatus = Database["public"]["Enums"]["event_status"]
export type HouseholdStatus =
  Database["public"]["Enums"]["household_status"]
export type LessonStatus = Database["public"]["Enums"]["lesson_status"]
export type PersonStatus = Database["public"]["Enums"]["person_status"]
export type PrayerRequestStatus =
  Database["public"]["Enums"]["prayer_request_status"]
export type PrayerRequestVisibility =
  Database["public"]["Enums"]["prayer_request_visibility"]
export type StudentStatus = Database["public"]["Enums"]["student_status"]
export type TeachingResourceType =
  Database["public"]["Enums"]["teaching_resource_type"]
export type VisitorCheckInStatus =
  Database["public"]["Enums"]["visitor_check_in_status"]
export type VolunteerAssignmentStatus =
  Database["public"]["Enums"]["volunteer_assignment_status"]
export type VolunteerCertificationStatus =
  Database["public"]["Enums"]["volunteer_certification_status"]
export type VolunteerSkillLevel =
  Database["public"]["Enums"]["volunteer_skill_level"]

type NullableRpcArguments<T> = T extends { Args: infer Args }
  ? Omit<T, "Args"> & {
      Args: { [Key in keyof Args]: Args[Key] | null }
    }
  : T

// PostgreSQL function parameters without defaults may still accept SQL NULL.
// The generated Supabase types do not represent that distinction, while the
// application intentionally uses null for optional RPC values.
export type ApplicationDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: {
      [Name in keyof Database["public"]["Functions"]]: NullableRpcArguments<
        Database["public"]["Functions"][Name]
      >
    }
  }
}
