# Communication Center Database Design

**Document Version:** 1.0
**Status:** Implemented
**Last Updated:** July 30, 2026

---

# Purpose

The Communication Center database supports ministry communication between authorized ministry staff and families or volunteers.

The design provides a secure, auditable communication platform while preventing accidental delivery of live email or SMS messages during development.

The Communication Center supports:

- Announcements
- Communication Templates
- Synthetic Email Delivery
- Synthetic SMS Delivery
- In-App Notifications
- Communication History
- Recipient Preference Enforcement
- Notification Read Status
- Audit History

---

# Design Goals

The database was designed to:

- Maintain a complete communication history.
- Support multiple communication methods.
- Respect recipient communication preferences.
- Prevent unauthorized communication.
- Provide complete auditing.
- Separate development testing from production providers.
- Support future integration with live messaging providers.

---

# Core Features

## Announcement Management

Supports:

- Draft announcements
- Published announcements
- Archived announcements
- Audience targeting
- Search
- Historical records

---

## Communication Templates

Supports reusable templates for:

- In-App Notifications
- Email
- SMS

Templates can be:

- Created
- Edited
- Archived
- Searched

---

## Synthetic Communication

Development communication is intentionally simulated.

Supported synthetic channels include:

- In-App
- Email
- SMS

No external communication providers are contacted.

---

## Notification Management

Supports:

- Personal notifications
- Read status
- Unread status
- Mark one as read
- Mark all as read
- Notification history

---

# Security Design

Communication data is protected through:

- Row Level Security (RLS)
- Role-based authorization
- Audience validation
- Recipient preference enforcement
- Audit logging

Only authorized ministry leaders may create communications.

Parents and families may only access communications intended for them.

---

# Database Components

The Communication Center introduces database support for:

- Announcements
- Communication Templates
- Communication History
- Notification Records
- Synthetic Delivery Tracking

Supporting functions include:

- Recipient Preview
- Notification Read Management
- Communication Auditing

---

# Relationships

The Communication Center integrates with:

- Member Management
- Volunteer Management
- Family Accounts
- Authentication
- Authorization
- Ministry Dashboard

Notifications are associated with authenticated users while maintaining complete communication history.

---

# Development Environment

During development:

- Email delivery is simulated.
- SMS delivery is simulated.
- In-App notifications are stored in the database.
- Delivery history is recorded.
- No production communication providers are used.

---

# Security Considerations

The Communication Center follows the platform security standards.

Implemented protections include:

- Authorization validation
- Audience isolation
- Recipient preference enforcement
- Audit history
- Communication history
- Secure notification ownership

No communication is delivered outside the intended audience.

---

# Future Enhancements

Future milestones may include:

- Scheduled communications
- Event-triggered messaging
- Push notifications
- Mobile notification support
- Additional communication providers
- Delivery analytics
- Read receipts
- Communication campaigns

---

# Related Documentation

- 02_Product_Requirements
- 03_Platform_Architecture
- 05_API
- 06_Security
- 09_Testing
- 10_Project_Journal
- 11_Release_Notes

---

# Revision History

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | July 30, 2026 | Initial Communication Center database documentation created for Milestone 11. |
| 1.1 | September 25, 2026 | Added Native Group Chat Phase 1A database and security foundation. |
| 1.2 | September 25, 2026 | Recorded the applied, immutable Chat migration and Phase 1C use of its protected message contract. |

## Native Group Chat Phase 1

Migration `202609250001_native_group_chat_phase1.sql` adds `chat_rooms`,
`chat_room_members`, `chat_messages`, and `chat_read_state`. All four force RLS,
deny direct authenticated table access, and use protected functions. Optional
Event/Schedule links are structural only in Phase 1A; dynamic source
authorization is deferred. Removed bodies remain retained in protected rows
but ordinary projections return only removal state. Read state is monotonic.
The migration is applied to development and must not be modified. Phases 1B–1C
use this existing schema and RPC contract without a follow-up database change.
