import { z } from "zod";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);

export const familyDetailsSchema = z.object({
  householdId: z.string().uuid(),
  name: z.string().trim().min(1).max(150),
  status: z.enum(["prospect", "active", "inactive", "archived"]),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  region: optionalText(100),
  postalCode: optionalText(20),
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
});

export const familyAdultSchema = z.object({
  householdId: z.string().uuid(),
  personId: z.string().uuid(),
  firstName: z.string().trim().min(1).max(100),
  preferredName: optionalText(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.union([z.string().trim().email().max(320), z.literal("")]).transform(
    (value) => value || null,
  ),
  phone: optionalText(40),
  relationshipLabel: z.string().trim().min(1).max(80),
  isResponsibleAdult: z.boolean(),
  isPrimaryContact: z.boolean(),
  receiveEmail: z.boolean(),
  receiveSms: z.boolean(),
  receiveEmergencyNotifications: z.boolean(),
});

export const createFamilySchema = familyDetailsSchema.omit({
  householdId: true,
}).extend({
  adultFirstName: z.string().trim().min(1).max(100),
  adultPreferredName: optionalText(100),
  adultLastName: z.string().trim().min(1).max(100),
  adultEmail: z.union([
    z.string().trim().email().max(320),
    z.literal(""),
  ]).transform((value) => value || null),
  adultPhone: optionalText(40),
  relationshipLabel: z.string().trim().min(1).max(80),
  receiveEmail: z.boolean(),
  receiveSms: z.boolean(),
  receiveEmergencyNotifications: z.boolean(),
}).refine(
  (value) => Boolean(value.adultEmail || value.adultPhone),
  { message: "Provide an email address or phone number." },
);

export const addFamilyAdultSchema = familyAdultSchema.omit({
  personId: true,
}).refine(
  (value) => Boolean(value.email || value.phone),
  { message: "Provide an email address or phone number." },
);
