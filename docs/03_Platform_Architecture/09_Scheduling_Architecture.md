# Scheduling Architecture

Milestone 14 adds a provider-independent internal scheduling domain. A schedule
may optionally reference an existing event, while Event Management remains the
authoritative event domain.

The server-only Scheduling service calls protected PostgreSQL RPC workflows.
Scheduling tables force row-level security and remain deny-by-default for
direct client access. RPCs enforce active-account and role authorization,
return manager projections or volunteer self-scoped published projections, and
write significant changes through the existing audit architecture.

Recurring rotations generate independent schedule occurrences. Uniqueness on
rotation and occurrence date prevents duplicates. Rotation pause, resume, end,
and future behavior are prospective; generated historical schedules and
assignments remain unchanged.

Schedules and rotations retain IANA timezones. No external calendar vendor or
credential model is embedded, preserving a provider-independent foundation for
a separately approved future integration.

