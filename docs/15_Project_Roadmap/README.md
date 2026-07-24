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
| 7–20 | Later approved roadmap | Not started |

Milestones 3, 5, and 6 were accepted by the Product Owner using separate
administrative and family accounts on 2026-07-24. Milestone 7 has not started.

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

- Volunteer profiles
- Background-check tracking
- Certifications
- Skills
- Availability
- Scheduling

## Milestone 8 — Attendance

- Check-in
- QR-code check-in
- Manual attendance
- Class attendance
- Visitor tracking
- Reports

## Milestone 9 — Events

- Event calendar
- Registration
- Capacity management
- Volunteer assignments
- Reminders
- Checklists

## Milestone 10 — Curriculum & Lessons

- Lesson library
- Curriculum plans
- Teaching resources
- File uploads
- Videos
- PDFs
- Discussion guides

## Milestone 11 — Communication Center

- Announcements
- Email
- SMS integration
- Push notifications
- Parent messaging
- Volunteer messaging

## Milestone 12 — Prayer & Care

- Prayer requests
- Care notes
- Follow-up
- Hospital visits
- Confidential notes

## Milestone 13 — Resource Library

- Documents
- Images
- Videos
- Search
- Categories
- Version history
- Downloads

## Milestone 14 — Scheduling

- Volunteer scheduler
- Classroom assignments
- Recurring rotations
- Availability
- Calendar integration

## Milestone 15 — Forms & Registrations

- Visitor cards
- Event registration
- Medical-release forms
- Permission slips
- Custom forms

## Milestone 16 — Reporting & Analytics

- Attendance trends
- Volunteer reports
- Event reports
- Giving statistics (optional)
- Growth metrics
- Ministry health dashboard

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
- Milestone 7 must not begin until the Product Owner explicitly starts it.
