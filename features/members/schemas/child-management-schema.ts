import { z } from "zod";

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => value ?? "",
    z.string().trim().max(maximum).transform((value) => value || null),
  );

const formText = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

const studentFieldsFromFormData = (formData: FormData) => ({
  firstName: formText(formData, "firstName"),
  preferredName: formText(formData, "preferredName"),
  lastName: formText(formData, "lastName"),
  birthDate: formText(formData, "birthDate"),
  grade: formText(formData, "grade"),
  status: formText(formData, "status"),
});

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

export const addChildRelationshipSchema = childRelationshipSchema.extend({
  householdId: z.string().uuid(),
});

export const createChildSchema = childDetailsSchema.omit({
  studentId: true,
}).extend({
  householdId: z.string().uuid(),
  guardianPersonId: z.string().uuid(),
});

export const createIndependentStudentSchema = childDetailsSchema.omit({
  studentId: true,
  medicalSummary: true,
  allergySummary: true,
  dietarySummary: true,
});

export const createChildInputFromFormData = (formData: FormData) => ({
  ...studentFieldsFromFormData(formData),
  householdId: formText(formData, "householdId"),
  guardianPersonId: formText(formData, "guardianPersonId"),
  medicalSummary: formText(formData, "medicalSummary"),
  allergySummary: formText(formData, "allergySummary"),
  dietarySummary: formText(formData, "dietarySummary"),
});

export const createIndependentStudentInputFromFormData = (formData: FormData) =>
  studentFieldsFromFormData(formData);

const fieldLabels: Record<string, string> = {
  firstName: "first name",
  lastName: "last name",
  birthDate: "birth date",
  grade: "grade",
  status: "student status",
  householdId: "household",
  guardianPersonId: "initial legal guardian",
};

export function studentValidationMessage(error: z.ZodError) {
  const field = String(error.issues[0]?.path[0] ?? "");
  const label = fieldLabels[field];
  return label
    ? `Enter a valid ${label}.`
    : "Review the student details and try again.";
}

export const createTagSchema = z.object({
  studentId: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const setChildTagsSchema = z.object({
  studentId: z.string().uuid(),
  tagIds: z.array(z.string().uuid()).max(100),
});
