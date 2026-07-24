import { z } from "zod";

const tagSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string(),
});

const relationshipSchema = z.object({
  personId: z.string().uuid(),
  displayName: z.string(),
  relationshipType: z.string(),
  isLegalGuardian: z.boolean(),
  isEmergencyContact: z.boolean(),
  isAuthorizedPickup: z.boolean(),
  maySignPermissionForms: z.boolean(),
  mayViewStudentInformation: z.boolean(),
  receiveEmail: z.boolean(),
  receiveSms: z.boolean(),
});

export const childWorkspaceSchema = z.object({
  id: z.string().uuid(),
  personId: z.string().uuid(),
  displayName: z.string(),
  firstName: z.string().nullable(),
  preferredName: z.string().nullable(),
  lastName: z.string().nullable(),
  birthDate: z.string(),
  grade: z.string(),
  status: z.enum([
    "prospective",
    "registered",
    "active",
    "inactive",
    "archived",
  ]),
  householdId: z.string().uuid(),
  householdName: z.string(),
  canManage: z.boolean(),
  canViewMedical: z.boolean(),
  medicalSummary: z.string().nullable(),
  allergySummary: z.string().nullable(),
  dietarySummary: z.string().nullable(),
  relationships: z.array(relationshipSchema),
  tags: z.array(tagSchema),
});
