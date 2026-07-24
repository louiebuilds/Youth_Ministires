import type {
  HouseholdStatus,
  StudentStatus,
} from "@/lib/supabase/database.types";

export type FamilyAdult = {
  id: string;
  firstName: string;
  preferredName: string | null;
  lastName: string;
  email: string | null;
  phone: string | null;
  relationshipLabel: string;
  isResponsibleAdult: boolean;
  isPrimaryContact: boolean;
  receiveEmail: boolean;
  receiveSms: boolean;
  receiveEmergencyNotifications: boolean;
};

export type FamilyChild = {
  id: string;
  displayName: string;
  grade: string;
  status: StudentStatus;
};

export type FamilyWorkspace = {
  id: string;
  name: string;
  status: HouseholdStatus;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  adults: FamilyAdult[];
  children: FamilyChild[];
};
