export type FormsCapability =
  | "forms.documents.manage"
  | "forms.documents.paper_confirm"
  | "forms.medical.view"
  | "forms.medical.verify"
  | "forms.participation.override"
  | "custom_forms.manage"
  | "custom_forms.submit"
  | "visitor_cards.manage";

export type DocumentKind = "permission_slip" | "medical_release";
export type DocumentValidityPolicy =
  | "event_specific"
  | "fixed_interval"
  | "explicit_expiration";
export type CustomFormFieldType =
  | "short_text"
  | "long_text"
  | "yes_no"
  | "single_choice"
  | "multiple_choice"
  | "date"
  | "acknowledgment";
export type CustomFormAssignmentType =
  | "event"
  | "student"
  | "household"
  | "volunteer"
  | "general_ministry";
export type VisitorCardSource = "staff" | "self_service";
