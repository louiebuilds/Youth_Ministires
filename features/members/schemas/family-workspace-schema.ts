import { z } from "zod";

const personStatusFields = {
  id: z.string().uuid(),
};

export const familyWorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: z.enum(["prospect", "active", "inactive", "archived"]),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  region: z.string().nullable(),
  postalCode: z.string().nullable(),
  countryCode: z.string(),
  adults: z.array(
    z.object({
      ...personStatusFields,
      firstName: z.string(),
      preferredName: z.string().nullable(),
      lastName: z.string(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      relationshipLabel: z.string(),
      isResponsibleAdult: z.boolean(),
      isPrimaryContact: z.boolean(),
      receiveEmail: z.boolean(),
      receiveSms: z.boolean(),
      receiveEmergencyNotifications: z.boolean(),
    }),
  ),
  children: z.array(
    z.object({
      ...personStatusFields,
      displayName: z.string(),
      grade: z.string(),
      status: z.enum([
        "prospective",
        "registered",
        "active",
        "inactive",
        "archived",
      ]),
    }),
  ),
});
