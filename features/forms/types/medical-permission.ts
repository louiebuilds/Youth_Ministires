export type MedicalFormStatus = {
  studentId: string;
  studentName: string;
  householdId: string;
  schoolYearStart: string;
  schoolYearEnd: string;
  templateVersionId: string;
  submissionId: string | null;
  ready: boolean;
  state: Record<string, unknown> | null;
};

export type EventPermissionSlipRequirement = {
  required: boolean;
  requirementId: string | null;
  templateVersionId: string | null;
  templateName: string | null;
  versionNumber: number | null;
};
