# Leadership Calendar and Header Notifications — October 17, 2026

## Decision

Louie approved two focused enhancements without changing the existing calendar
behavior:

- Youth Pastors manage private leadership calendar entries.
- Platform Administrators may view those entries but cannot change them.
- Every other role is denied visibility.
- Leadership entries use a distinct purple presentation and a Leadership only
  label.
- A notification bell beside the account identity combines announcements,
  existing in-app notifications, and unread chat activity.

## Local implementation

Forward migration `202610170001_leadership_calendar_notifications.sql` adds the
private calendar entity, audited protected create/update/delete functions,
role-filtered calendar projection, announcement read state, and protected
header notification functions. Existing applied migrations were not modified.

The Calendar workspace exposes an intentional leadership-entry form only to a
Youth Pastor. Platform Administrators see the resulting purple entries as
read-only calendar items. Other roles continue to receive only the calendar
items already authorized for them.

The shared header now presents a compact notification center with a capped
unread badge, deep links, mark-all-read support for announcements and in-app
notifications, and the existing chat read lifecycle. The panel refreshes on a
25-second visible-tab interval and when a hidden tab becomes visible. It does
not broadcast or preview private chat message bodies.

## Verification

- `npm run calendar:test` — passed
- `npm run lint` — passed
- `npm run build` — passed, including TypeScript and static page generation
- `git diff --check` — passed with informational Windows line-ending warnings

## Remaining work

- Live-test Youth Pastor create/edit/delete behavior.
- Live-test Platform Administrator read-only visibility.
- Confirm Staff, Volunteer, and Parent concealment.
- Live-test announcement, in-app, and chat badge/read behavior before accepting
  the enhancement.

## Live deployment

Migration `202610170001` was applied individually to the Supabase project used
by the live Vercel environment and confirmed in remote migration history. The
other locally pending migrations were not applied. Vercel production deployment
`dpl_CukaELoBPYiEP4ytQwc8unTowvTF` built successfully, reached READY, and was
aliased to `https://youth-ministries.vercel.app`. The post-deployment endpoint
check returned the expected unauthenticated redirect to `/login`.
