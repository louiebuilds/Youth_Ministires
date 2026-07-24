import { z } from "zod";

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).transform((value) => value || null);

export const childDetailsSchema = z.object({
  studentId: z.string().uuid(),
  firstName: z.string().trim().min(1).max(100),
  preferredName: optionalText(100),
  lastName: z.string().trim().min(1).max(100),
  birthDate: z.iso.date(),
  grade: z.string().trim().min(1).max(40),
  status: z.enum([
    "prospective",
    "registered",
    "active",
    "inactive",
    "archived",
  ]),
  medicalSummary: optionalText(4000),
  allergySummary: optionalText(4000),
  dietarySummary: optionalText(2000),
});

export const childRelationshipSchema = z.object({
  studentId: z.string().uuid(),
  personId: z.string().uuid(),
  relationshipType: z.string().trim().min(1).max(80),
  isLegalGuardian: z.boolean(),
  isEmergencyContact: z.boolean(),
  isAuthorizedPickup: z.boolean(),
  maySignPermissionForms: z.boolean(),
  mayViewStudentInformation: z.boolean(),
  receiveEmail: z.boolean(),
  receiveSms: z.boolean(),
});

export const createChildSchema = childDetailsSchema.omit({
  studentId: true,
}).extend({
  householdId: z.string().uuid(),
  guardianPersonId: z.string().uuid(),
});

export const createTagSchema = z.object({
  studentId: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const setChildTagsSchema = z.object({
  studentId: z.string().uuid(),
  tagIds: z.array(z.string().uuid()).max(100),
});
