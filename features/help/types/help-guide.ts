export const helpGuideCategories = [
  "Getting Started",
  "Students & Families",
  "Events & Attendance",
  "Check-In",
  "Forms & Registrations",
  "Volunteers & Scheduling",
  "Communications",
  "Parent Community",
  "Prayer & Care",
  "Resources",
  "Reporting",
  "Administration",
  "Troubleshooting",
] as const;

export type HelpGuideCategory =
  (typeof helpGuideCategories)[number];

export type HelpGuideAudience =
  | "Youth Director"
  | "Administrator"
  | "Staff"
  | "Volunteer"
  | "Parent";

export type HelpGuideSection = Readonly<{
  title: string;
  steps: readonly string[];
  note?: string;
}>;

export type HelpGuide = Readonly<{
  slug: string;
  title: string;
  summary: string;
  category: HelpGuideCategory;
  audience: readonly HelpGuideAudience[];
  keywords: readonly string[];
  sections: readonly HelpGuideSection[];
}>;
