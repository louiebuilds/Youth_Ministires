# Youth Ministries Platform Roadmap

**Status:** Approved

**Owner:** Product Owner

**Restored:** 2026-07-24

This is the authoritative milestone sequence for the Youth Ministries Platform.
Milestone names and numbers must not be replaced by implementation-layer names.
Technical journals and commits may describe the work they contain, but product
planning, status reporting, and future scope must reference this roadmap.

## Current Status

| Milestone | Name | Status |
|---:|---|---|
| 0 | Vision & Planning | Complete |
| 1 | Project Foundation | Complete |
| 2 | Foundation Infrastructure | Complete |
| 3 | Authentication & User Management | Complete |
| 4 | Application Shell | Complete |
| 5 | Ministry Dashboard | Complete |
| 6 | Member Management | Complete |
| 7 | Volunteer Management | Complete |
| 8 | Attendance | Complete |
| 9 | Events | Complete |
| 10 | Curriculum & Lessons | Complete |
| 11 | Communication Center | Complete |
| 12 | Prayer & Care | Original milestone complete; September checkpoint passed with follow-up work |
| 13 | Resource Library | Complete |
| 14 | Scheduling | Complete |
| 15 | Forms & Registrations | Active — remaining real-document and acceptance work |
| 16 | Reporting & Analytics | Complete |
| 17–20 | Later approved roadmap | Not started |

Milestones 3 and 5–12 were accepted by the Product Owner using separate
administrative and family accounts. Milestone 12 acceptance passed on
2026-08-04; its September 2026 current-platform checkpoint also passed with
documented follow-up enhancements. Final platform acceptance will be rerun after
feature development is complete.

## Product Owner Development Strategy — September 2026

The broader current-platform acceptance campaign stopped after the Prayer &
Care checkpoint. The Product Owner chose to complete the platform feature set
before spending additional time on comprehensive acceptance because testing
was uncovering features and workflow improvements that would change previously
tested areas.

The current sequence is:

1. Prayer & Care current-platform checkpoint — completed
2. Return to feature development
3. Complete remaining features and approved workflow/UX improvements
4. Prepare or reset clean synthetic acceptance data
5. Run comprehensive end-to-end final platform acceptance
6. Complete Production Readiness

Previously accepted modules remain valuable evidence, but no additional module
should be marked finally accepted during this development phase.

### Feature-Development Context

Planned work includes:

- Prayer & Care Parent participation, care/follow-up editing, lifecycle-history
  presentation, care-to-follow-up linking, and caregiver eligibility work
- Administration
- Parent Community, distinct from official Communications
- A role-aware Month/Week/Agenda/List Platform Calendar projecting authorized
  Events, Schedules, registrations, and related dates with deep links
- Official Communications UX improvements and future moderated GroupMe-like
  groups/channels, replies, membership, notifications, and attachments
- Mobile-responsive and PWA completion before considering native applications
- AI Ministry Assistant
- Remaining Forms & Registrations real-document implementation and acceptance
- A Platform UX Consistency Pass
- Existing defects and enhancements retained in `docs/PROJECT_STATUS.md`
- Production Readiness after final comprehensive acceptance

The Platform UX Consistency Pass will review Members/Families, Events,
Attendance, Check-In, Volunteers, Scheduling, Communications, Curriculum,
Prayer & Care, Resources, Forms & Registrations, Visitors, Reporting, and the
future Administration workspace. Page titles and compact primary actions should
precede active/current records; history follows active work; large create/edit
forms open intentionally in an appropriate panel, drawer, modal, or dedicated
route rather than permanently displacing operational records.

## Historical Numbering Reconciliation

Repository commits `379def4`, `f7915cb`, and `f5c2560` used technical milestone
labels that diverged from this original product roadmap. Those commits are
preserved as immutable history. Their work maps to the roadmap as follows:

| Repository label | Roadmap contribution |
|---|---|
| Milestone 1 — Platform Architecture | Milestone 0 planning and technical standards |
| Milestone 2 — Foundation Infrastructure | Milestones 1–4 foundation, authentication, and shell work |
| Milestone 3 — Core Database Foundation | Cross-cutting data foundation for later roadmap milestones |
| Milestone 4 — Security | Cross-cutting authorization and privacy foundation |
| Milestone 5 — Ministry Dashboard | Milestone 5 — Ministry Dashboard |

The Product Owner resolved the Milestone 3 variance on 2026-07-24. Self-service
profile and password workflows and audited administrator management of existing
accounts are implemented. The approved five-role model remains authoritative,
and the Project Charter continues to exclude student logins from Version 1.
Creating Auth identities and administrator-triggered recovery emails require a
future approved privileged identity-provider gateway and are not part of this
reconciliation.

## Milestone 0 — Vision & Planning

**Status:** Complete

- Vision
- Mission statement
- Scope
- Functional requirements
- Non-functional requirements
- User roles
- Architecture documents
- Technical standards
- Development blueprint

## Milestone 1 — Project Foundation

**Status:** Complete

- Create the Next.js project
- Configure TypeScript
- Configure Tailwind CSS
- Include `AGENTS.md`
- Restore documentation
- Verify the application starts
- Establish project structure
- Deliver a working application, documentation, and project organization

## Milestone 2 — Foundation Infrastructure

**Status:** Complete

- Install core dependencies
- Configure environment variables
- Configure Supabase
- Establish the authentication foundation
- Add request proxy/session handling
- Add shared services
- Add base project folders
- Deliver Supabase connectivity, authentication infrastructure, service-layer
  foundations, error handling, and environment configuration

## Milestone 3 — Authentication & User Management

**Status:** Complete

Original features:

- Login
- Register
- Forgot password
- Email verification
- User profile
- Change password
- Role management

Original roles:

- Super Admin
- Ministry Admin
- Ministry Leader
- Teacher
- Volunteer
- Parent
- Student

Reconciled implementation:

- The current approved roles are Platform Administrator, Youth Pastor, Staff
  Member, Volunteer, and Parent or Guardian.
- Student accounts remain outside Version 1.
- Every authenticated account can view its profile, update its display name,
  and change its password.
- Only Platform Administrators can search existing accounts and update display
  name, permanent role, or lifecycle status.
- Account changes are database-enforced and audited.
- A Platform Administrator cannot demote or deactivate their own account.
- Creating Auth identities and administrator-triggered recovery emails remain
  deferred until a privileged identity-provider gateway is separately approved.

## Milestone 4 — Application Shell

**Status:** Complete

- Sidebar
- Header
- Navigation
- Notifications foundation
- User menu
- Responsive layout
- Dashboard framework

## Milestone 5 — Ministry Dashboard

**Status:** Complete

- Attendance summary
- Upcoming events
- Volunteer status
- New registrations
- Prayer-request summary
- Birthdays
- Announcements
- Quick actions
- Separate administrative and family dashboard contexts
- Clearly disclosed synthetic preview data until later feature milestones
  provide authorized live data

## Milestone 6 — Member Management

**Status:** Complete

- Member directory
- Families
- Children
- Contact information
- Medical notes
- Permissions
- Tags
- Search

The completed implementation includes role- and relationship-scoped
directories, family and child workspaces, audited creation and editing,
contact/communication preferences, guarded medical summaries, relationship
permissions, ministry-only tags, expanded search, and archive-based lifecycle
controls.

## Milestone 7 — Volunteer Management

**Status:** Complete

- Volunteer profiles
- Background-check tracking
- Certifications
- Skills
- Availability
- Scheduling

The completed implementation includes a protected volunteer directory,
background-check status and expiration tracking, certification metadata,
skills, recurring availability, assignments to existing events, volunteer
responses, audit records, and separate ministry-manager, volunteer-self, and
family-denial contexts.

## Milestone 8 — Attendance

**Status:** Complete

- Check-in
- QR-code check-in
- Manual attendance
- Class attendance
- Visitor tracking
- Reports

The completed implementation includes manual and class attendance sessions,
audited corrections and finalization, event custody check-in and check-out,
short-lived one-use family QR passes, explicit authorized-pickup confirmation,
temporary visitor tracking, emergency rosters, and date-filtered operational
reports. Mobile camera scanning remains Milestone 19, event creation remains
Milestone 9, and cross-ministry analytics remain Milestone 16.

## Milestone 9 — Events

**Status:** Complete

- Event calendar
- Registration
- Capacity management
- Volunteer assignments
- Reminders
- Checklists

The completed implementation includes event creation, editing, publishing,
archiving, calendar discovery, family registration and cancellation,
capacity-aware waitlisting, guarded manual promotion, event-centered volunteer
assignments, in-app reminders, and auditable checklists. Email and SMS delivery
remain Milestone 11, permission-form workflows remain Milestone 15, recurring
rotations and calendar integration remain Milestone 14, and mobile camera
features remain Milestone 19.

## Milestone 10 — Curriculum & Lessons

**Status:** Complete

- Lesson library
- Curriculum plans
- Teaching resources
- File uploads
- Videos
- PDFs
- Discussion guides

The completed ministry-only implementation includes searchable lessons,
discussion guides, ordered curriculum plans, external HTTPS teaching links,
and validated private PDF, document, and MP4 storage with short-lived audited
downloads. Ministry managers maintain content, volunteers receive read-only
published content, and family accounts are denied. General resource-library
version history remains Milestone 13 and AI curriculum features remain
Milestone 18.

## Milestone 11 — Communication Center

**Status:** Complete

- Announcements
- Email
- SMS integration
- Push notifications through secure in-app notifications; native browser or
  mobile push delivery remains deferred to Milestone 19
- Parent messaging
- Volunteer messaging

The implementation includes audience-scoped announcements, reusable templates,
recipient previews, synthetic provider-safe email/SMS, communication history,
and personal in-app notification read state. Real providers, scheduling, and
event-triggered automation are deferred. The Product Owner accepted the
administrator and family workflows, including notification read-state controls.

## Milestone 12 — Prayer & Care

**Status:** Original milestone complete; September 2026 current-platform
checkpoint passed with documented follow-up enhancements

- Prayer requests
- Care notes
- Follow-up
- Hospital visits
- Confidential notes

The completed implementation includes sanitized public prayer summaries,
role- and assignment-scoped leadership/private requests, answered and archived
history, confidential notes and hospital visits, assigned follow-ups,
completion and cancellation history, care-note archival, auditing, and strict
direct-access denial. The Product Owner accepted administrator and family
workflows using synthetic data.

Further feature development is planned for family-scoped moderated prayer
participation, care and follow-up editing, richer protected lifecycle history,
care-to-follow-up linking, and caregiver eligibility. Prayer & Care will be
included in the final comprehensive platform acceptance rerun.

## Milestone 13 — Resource Library

**Status:** Complete — Product Owner accepted August 11, 2026

- Documents
- Images
- Videos
- Search
- Categories
- Version history
- Downloads

## Milestone 14 — Scheduling

**Status:** Complete — current implementation evidence retained; final platform
acceptance rerun planned

- Volunteer scheduler
- Classroom assignments
- Recurring rotations
- Availability
- Calendar integration

## Planned Enhancement — Platform Calendar

**Status:** Implemented, applied to development, and Product Owner live
acceptance passed September 24, 2026.

The platform will add a role-aware Calendar navigation item as a view of authoritative existing dates, not as a second scheduling engine. Initial views are planned for Month, Week, and Agenda/List, with every item deep-linking to its authoritative Event, Schedule, registration, or other domain source.

- Platform Administrators, Youth Pastors, and authorized Staff: ministry Events, relevant published schedules and responsibilities, and other authorized ministry dates.
- Volunteers: published Events and their own published Scheduling responsibilities.
- Parents: published Events plus authorized family and child registrations and activities.
- Future Student accounts: dates authorized for that Student.

The implemented first release provides responsive Month, Week, and Agenda
views through a protected unified projection and deep links to authoritative
Event and Schedule workspaces. It remains read-only and does not duplicate
Event or Scheduling creation or lifecycle behavior.

Future planning may evaluate iCal, Google Calendar, Apple Calendar, and Outlook
integration. External synchronization is not part of the implemented first
release.

## Milestone 15 — Forms & Registrations

**Status:** Active — remaining real-document workflow and acceptance work

- Visitor cards
- Event registration
- Medical-release forms
- Permission slips
- Custom forms

## Milestone 16 — Reporting & Analytics

**Status:** Complete — Product Owner accepted August 11, 2026

- Attendance trends
- Volunteer reports
- Event reports
- Giving statistics excluded from Version 1
- Growth metrics
- Ministry health dashboard

The completed implementation provides the unified `/reports` workspace,
consistent validated date ranges, protected live aggregate projections, private
saved-report configurations, exports, print output, and transparent metrics
without a composite score.

## Milestone 17 — Administration

- Settings
- Ministry configuration
- Roles
- Permissions
- Audit log
- System preferences

## Milestone 18 — AI Ministry Assistant

- Lesson suggestions
- Event planning
- Volunteer recommendations
- Curriculum search
- Document search
- AI chat

## Milestone 19 — Mobile Experience

- Responsive design
- Mobile navigation
- Mobile check-in
- Camera integration
- Offline support where appropriate

## Milestone 20 — Production Readiness

- Performance optimization
- Accessibility review
- Security audit
- Error monitoring
- Backups
- Documentation review
- Deployment
- Version 1.0 release

## Roadmap Governance

- Work proceeds one milestone at a time.
- The Product Owner approves scope or sequencing changes before implementation.
- Cross-cutting technical work must be mapped to this roadmap rather than
  creating a competing milestone sequence.
- A milestone is complete only after implementation, automated verification,
  Product Owner acceptance, documentation, and a milestone commit.
- Synthetic data is required for development and testing.
- During the current feature-development phase, new work requires Product Owner
  and Technical Lead scope approval; final acceptance follows the completed
  feature set rather than continuing module-by-module now.
