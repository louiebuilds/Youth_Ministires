# Milestone 6 — Member Management

**Date:** 2026-07-24
**Release:** v0.7.0
**Status:** Complete

## Outcome

Milestone 6 replaces the family and student placeholders with operational,
relationship-aware workspaces. Ministry staff can create and maintain
families, responsible adults, children, contact preferences, medical
summaries, relationship permissions, and internal tags. Search spans member,
family, adult, child, grade, address, lifecycle, and tag criteria.

Family accounts remain a separate context. They receive only explicitly
related families and children, cannot browse the ministry directory, cannot
mutate ministry records, and never receive internal tags or administrative
relationship controls.

## Privacy and Audit

Routine child labels use preferred/first name and last initial. Full child
identity fields are available only inside ministry editing controls. Medical
summaries require ministry management access or an explicit legal-guardian
relationship with view permission.

Every approved mutation is performed through a reauthorizing database function
and appends a safe audit event. Medical-note contents are excluded from audit
metadata. Direct authenticated mutations were revoked.

## Verification

The complete automated regression suite and production build passed. Connected
Supabase acceptance returned 11 true checks. Product Owner browser acceptance
passed with separate administrator and family accounts using synthetic data.

Milestone 7 — Volunteer Management has not started.
