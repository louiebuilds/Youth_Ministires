# Project Journal

## Platform Calendar

**Date:** September 24, 2026

**Status:** Implemented, applied to development, and Product Owner live acceptance passed

## Objective

Provide one role-aware view of existing ministry dates without creating a
second event or scheduling system.

## Implementation

- Added `/calendar` to desktop and mobile navigation for authenticated roles.
- Added responsive Month, Week, and Agenda views with previous, next, and Today
  navigation.
- Projected Events, Schedules, volunteer responsibilities, and authorized
  family registrations through one protected read-only RPC.
- Deep-linked every item to its authoritative Event or Schedule workspace.
- Kept external calendar providers and synchronization outside this release.

## Authorization

- Platform Administrators, Youth Pastors, and Staff see authorized ministry
  Events and Schedules, including planning-state records.
- Volunteers see published/active Events and only their own published Schedule
  responsibilities.
- Parents see published/active Events and relationship-authorized child
  registration context, but no Schedule rows.
- Anonymous and inactive-account access is denied. Range validation is capped
  at 400 days, and direct table permissions remain unchanged.

## Verification

The dedicated Calendar verifier executes the migration from a clean database
and covers manager, assigned Volunteer, unassigned Volunteer, Parent,
anonymous, invalid-range, family-context, navigation, responsive-layout, and
deep-link behavior. Calendar, Scheduling, Event/registration, and security
verification pass, along with lint, TypeScript, the production build, and diff
validation.

## Development deployment and live acceptance

Migration `202609240001_platform_calendar.sql` was applied successfully to the
linked development project and its migration-history entry was repaired to the
applied state. `npx supabase migration list` confirms that `202609240001`
matches locally and remotely. Known older migration-history drift remains
unchanged.

The Product Owner completed live acceptance for all three roles:

- Managers verified the default Month view, Month/Week/Agenda switching,
  Previous/Today/Next navigation, distinct Event and Schedule presentation,
  both projection types, and authoritative Event and Schedule deep links.
- The Parent verified the published Youth Fall Kickoff Event, no staff or
  volunteer Schedule disclosure, registered-child context for Gillian
  VanderMolen, and the role-safe Event workspace.
- The Volunteer verified the published Event, only their own Schedule
  assignment, and role-safe Schedule and Event destinations without manager
  controls.

One non-blocking usability issue remains: the Volunteer Calendar Schedule card
subtitle displays `Location added.` for the accepted test record. Retain this
as a usability-backlog item rather than a Calendar acceptance blocker. The
existing Scheduling issue where schedule detail says `Linked Event` instead of
the linked Event title also remains outside this Calendar correction.

## Next Step

Retain this accepted Calendar checkpoint as evidence for the later comprehensive
platform acceptance rerun. Do not treat it as final acceptance of the entire
platform.
