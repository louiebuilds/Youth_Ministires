import type { HelpGuide } from "@/features/help/types/help-guide";

export const helpGuides: readonly HelpGuide[] = [
  {
    slug: "youth-director-quick-start",
    title: "Youth Director Quick Start Guide",
    summary:
      "A practical weekly workflow for preparing, running, and following up on youth ministry activities in the platform.",
    category: "Getting Started",
    audience: ["Youth Director"],
    keywords: [
      "weekly workflow",
      "events",
      "calendar",
      "students",
      "families",
      "forms",
      "registrations",
      "volunteers",
      "check-in",
      "attendance",
      "communications",
      "prayer",
      "care",
      "troubleshooting",
    ],
    sections: [
      {
        title: "Start of the Week",
        steps: [
          "Review upcoming events.",
          "Review the calendar.",
          "Check event details.",
          "Confirm required forms and registrations.",
          "Review known attendance needs.",
        ],
      },
      {
        title: "Students and Families",
        steps: [
          "Review new or updated student records.",
          "Confirm family relationships.",
          "Review important contact information.",
          "Do not expose sensitive information unnecessarily.",
        ],
      },
      {
        title: "Forms and Registrations",
        steps: [
          "Review submitted forms.",
          "Check for missing or incomplete forms.",
          "Review medical and permission information only when authorized.",
          "Follow existing ministry privacy rules.",
        ],
      },
      {
        title: "Volunteers and Scheduling",
        steps: [
          "Review volunteer assignments.",
          "Confirm schedule coverage.",
          "Make adjustments if needed.",
          "Follow church policy for background checks; they are not a required platform workflow at this time.",
        ],
      },
      {
        title: "Before an Event",
        steps: [
          "Confirm the event date, time, and location.",
          "Review expected students.",
          "Review required forms.",
          "Review volunteer coverage.",
          "Prepare Check-In.",
        ],
      },
      {
        title: "Check-In and Attendance",
        steps: [
          "Open the event in Check-In.",
          "Use family or student search, or QR identification when available.",
          "Remember that QR codes identify the family or household only.",
          "Never use a QR code to authorize student release.",
          "Confirm actual attendance.",
          "Follow existing pickup and release rules.",
        ],
      },
      {
        title: "Communications",
        steps: [
          "Send official announcements or messages through the appropriate Communications area.",
          "Use Parent Community for organized parent discussion.",
          "Do not use Community for private or sensitive matters.",
        ],
      },
      {
        title: "Prayer and Care",
        steps: [
          "Review follow-ups that require attention.",
          "Keep confidential care information limited to authorized users.",
          "Do not copy sensitive care information into public or Community areas.",
        ],
      },
      {
        title: "After an Event",
        steps: [
          "Review attendance.",
          "Confirm records are complete.",
          "Follow up on missing forms or other issues.",
          "Review reports if needed.",
          "Record care and follow-up items appropriately.",
        ],
      },
      {
        title: "End of Week",
        steps: [
          "Review the upcoming calendar.",
          "Check open forms and registrations.",
          "Review volunteer needs.",
          "Review unresolved care and follow-ups.",
          "Prepare for the next ministry week.",
        ],
      },
      {
        title: "When Something Goes Wrong",
        note: "These quick checks are intentionally high-level. More detailed troubleshooting guides will be added in a future phase.",
        steps: [
          "Parent cannot log in: confirm the parent is using the invited email address, then ask an administrator to review the account if the issue continues.",
          "Parent cannot see expected information: confirm the correct family relationships and access are in place; do not expose records while troubleshooting.",
          "QR camera does not open: check browser camera permission and use family or student search as the fallback.",
          "Check-In scanner cannot be used: use the established search workflow and record attendance manually.",
          "Form appears missing: confirm the correct event, assignment, audience, and form status.",
          "Volunteer cannot access an expected area: confirm the volunteer is signed into the correct active account and has the required assignment; ask an administrator to review access if needed.",
        ],
      },
    ],
  },
];

export function findHelpGuide(slug: string) {
  return helpGuides.find((guide) => guide.slug === slug);
}
