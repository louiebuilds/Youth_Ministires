# Dashboard First-Screen Redesign — October 18, 2026

## Approved direction

Louie approved a focused redesign of the main dashboard so the first screen
feels welcoming, visually clear, and immediately useful. Quick Actions remain,
but move to the top. Unread announcements must be more visible without adding a
second notification system or making the page busier.

## Implementation

- Added a shared branded welcome area for leadership, Parent, and Volunteer
  dashboards with a Central-time greeting, display name, and current date.
- Moved a maximum of four role-specific Quick Actions directly below the hero.
- Added a prominent amber unread-announcement spotlight using the existing
  protected notification and announcement projections.
- Kept destination selection server-authoritative through the existing header
  notification action; no client-provided redirect is trusted.
- Added a bounded announcement preview and remaining-unread count.
- Removed duplicate lower-page announcement cards.
- Limited leadership metrics, upcoming events, and Volunteer assignments to
  the three most immediately relevant items.
- Preserved complete records in their existing authorized workspaces.
- Added no database migration and changed no role permission.

## Verification

- `npm run dashboard:test` — passed
- `npm run lint` — passed
- TypeScript (`npx tsc --noEmit`) — passed
- `npm run build` — passed
- `git diff --check` — passed with informational Windows line-ending warnings

## Remaining acceptance

- Verify the welcome, Quick Actions, and spotlight as Platform Administrator,
  Youth Pastor, Staff, Parent, and Volunteer.
- Confirm the two-column mobile Quick Actions remain readable.
- Open an unread spotlight and confirm both the spotlight and bell update.
- Confirm read, expired, archived, and unauthorized announcements do not appear.

## Live deployment

Vercel production deployment `dpl_HcsWUi3CT9cNLVBzd4BA7hg49KNP` completed in
READY state and was aliased to `https://youth-ministries.vercel.app`. The
post-deployment endpoint check returned the expected unauthenticated redirect
to `/login`. No Supabase migration or Vercel environment-variable change was
required for this release.
