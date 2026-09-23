# Milestone 10 — Curriculum & Lessons

**Date:** 2026-07-30
**Release:** v0.11.0
**Status:** Complete

## Outcome

Milestone 10 adds a ministry-only Curriculum workspace. Ministry managers can
create, edit, publish, search, and archive lessons; record scripture,
objectives, teaching notes, discussion guides, and preparation notes; create
curriculum plans; and maintain ordered lesson sequences.

Teaching resources support HTTPS video/link records and validated private PDF,
DOCX, PPTX, TXT, and MP4 uploads. Authorized downloads use short-lived signed
links and create audit events. Volunteers receive read-only published content.
Family accounts cannot discover curriculum routes, records, or files.

## Verification

Focused synthetic verification covers clean migration execution, role
boundaries, lesson and plan workflows, ordered lessons, external resources,
private-file metadata, storage authorization, protected downloads, auditing,
and archive denial. All earlier regressions, ESLint, TypeScript, and the
production build passed.

The Product Owner verified the lesson library, search, create/edit/archive
lifecycle, discussion guides, curriculum plans, ordered lesson display with
add/remove sequence maintenance, external resource links, private
upload/download, and family denial. Move up/down resequencing was not present
in that original workflow and was discovered as a later acceptance gap.

Milestone 11 — Communication Center was not started.

## Full Platform Acceptance Correction — Private File Classification

On September 20, 2026, live acceptance found that selecting **Document** and
then choosing a PDF uploaded the object but failed database finalization. The
application had treated the editable category as authoritative, while the
established database contract correctly accepts `application/pdf` only with
canonical resource type `pdf`. Client cleanup removed the failed object, and a
read-only development check confirmed that no orphaned Storage object or
partial teaching-resource row remained.

The application now derives classification from the selected file's matching
extension and MIME type before upload. PDF maps to `pdf`, MP4 to `video`, and
DOCX, PPTX, and TXT map to `document`; unsupported or spoofed combinations fail
before Storage is contacted. The form displays the detected type, finalization
uses the same canonical classification, and exact-object cleanup remains in
place for a later finalization failure. Safe server diagnostics contain only
the operation, error code, and failure category.

Focused verification covers all supported mappings, MIME/extension mismatch
rejection, the former invalid PDF pairing, canonical PDF finalization, one
resource/audit result, manager enforcement, Parent denial, protected download,
and exact-object cleanup intent. No migration, schema, RLS, role, capability,
live-data, or generated-type change was made. Product Owner live retesting is
still required; this checkpoint does not mark Curriculum accepted.

## Full Platform Acceptance Correction — Lesson Workspace Usability

Live Product Owner review found the lesson-detail page difficult to navigate
because the resource forms, resource history, every lesson field, lifecycle
controls, and full editor rendered together. The workspace now separates
Overview, Lesson Content, Discussion, Resources, and Preparation into
deep-linkable sections. The responsive section navigation scrolls horizontally
at narrow widths without losing lesson context.

Overview prioritizes summary, objective, scripture, and resource/preparation
status. Teaching, discussion, and preparation text render as readable content.
The full editor is available only through an intentional **Edit lesson** action.
Draft publishing is a clear header action that reuses the existing audited
lesson-update workflow, while archive remains visually separated as destructive
behavior. Resource links and private uploads retain their existing protected
workflows but show their large forms only after **Add resource** or **Upload
private file** is selected.

No migration, schema, authorization, RLS, Storage, generated-type, or live-data
change was made. Automated verification passed; Product Owner live retesting is
pending and Curriculum has not been marked finally accepted.

## Live Acceptance Correction — Resources Panel State

The first live retest of the lesson workspace showed both the Add resource and
Upload private file forms open in Resources. Although each form had a separate
visibility flag initialized to false, the two independent flags allowed both
to be true and allowed that invalid UI state to be retained by client/router
state. Verification had checked only for conditional JSX and had not exercised
the actual panel transitions.

Resources now has a single `link | upload | null` panel state. It starts at
`null`; choosing either action replaces the other panel; choosing the active
action or **Cancel** returns to the clean resource list. Existing resource cards
remain visible. Runtime regression coverage now exercises the initial, open,
switch, and cancel transitions in addition to verifying the management and
resource-card boundaries.

No database, migration, schema, RLS, capability, Storage, generated-type, or
live-data change was made. Curriculum remains pending Product Owner retest.

## Live Acceptance Correction — Curriculum Plan Lesson Reordering

Live acceptance found that Curriculum Plans persisted and displayed ordered
lesson sequences but exposed only Add and Remove. Managers could not rearrange
existing relationships without removing and recreating them. This also exposed
an inaccurate earlier journal statement that lesson resequencing had already
been verified; the statement above now distinguishes add/remove sequence
maintenance from the newly implemented Move up/down capability.

Forward migration `202609210001_curriculum_plan_lesson_reordering.sql` adds one
protected `move_curriculum_plan_lesson` RPC. It resolves the plan from the
relationship, locks the non-archived plan and affected rows, validates `up` or
`down`, safely swaps adjacent positive sequence numbers without recreating
relationships, and records one sanitized
`curriculum.plan_lesson_reordered` audit event. Existing Add and Remove RPCs are
unchanged.

Managers now receive boundary-aware **Move up**, **Move down**, and **Remove**
controls under **Lesson sequence**. Volunteers retain the read-only ordered
view and Parents remain denied. Automated verification passed locally.

## Full Platform Acceptance — Current Scope Passed

Product Owner live acceptance of the currently implemented Curriculum &
Lessons scope is **PASSED**. This is acceptance of the present implementation,
not a statement that Curriculum can never receive future approved enhancements.
Overall Full Platform Acceptance remains in progress.

Administrator testing passed the library; lesson creation, editing, publishing,
and the five-section lesson workspace; external teaching resources; private PDF
upload, canonical PDF classification, and protected download; clean mutually
exclusive Add resource and Upload private file panels with Cancel; curriculum
plan creation, editing, publishing, and adding existing lessons; and persisted
lesson sequencing with Move up/down, boundaries, and audit evidence.

The accepted published plan is **Fall 2026 Middle School Faith Series** for
Grades 6–8. Both included lessons are Published, in this accepted order:

1. Faith When Life Gets Difficult
2. Prayer in Everyday Life

Volunteer `volunteer.test@example.com` could read only Published plans and
lessons, the published plan sequence, and all five published lesson sections.
Draft content and all edit, resource-management, move, remove, and creation
controls remained unavailable. Parent `vandermolenlouis@gmail.com` had no
Curriculum navigation and received a concealed 404 for direct `/curriculum`
access.

Narrow/mobile testing passed for the library, published plan, and lesson
workspace. Collapsed navigation, headers, filters, cards, summaries, lesson
sequence, section navigation, lesson content, and At-a-glance content remained
usable without observed clipping or broken horizontal layout.

The private-resource acceptance correction passed with a live PDF upload and
protected download. The original statement about ordered lessons now correctly
describes add/remove sequence maintenance only; Move up/down was added later in
response to the acceptance-discovered gap.

Migration `202609210001_curriculum_plan_lesson_reordering.sql` was manually
executed against the linked development project. Its history was then recorded
with `npx supabase migration repair --status applied 202609210001`, which
reported `Repaired migration history: [202609210001] => applied`. Live testing
confirmed the second lesson could move to position 1, persisted after browser
refresh, and moved back to restore the accepted sequence. Boundary controls,
sanitized reorder auditing, and Volunteer read-only behavior also passed.
