export type FamilyManagementState =
  | { success: true; message: string }
  | { success: false; message?: string };
