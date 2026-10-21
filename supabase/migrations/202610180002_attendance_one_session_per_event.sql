
-- Youth Ministries Platform
-- Migration: 202610180002
-- One attendance session per event
--
-- Purpose:
--   Allow only one attendance session per event.
--   Preserve existing attendance records.
--   Preserve historical audit records.
--   Reconcile two unused Fall Costume Party sessions.
--   Record reconciliation using audit_source = migration.
--   Preserve existing authorization and RPC signature.
--
-- SAFETY:
--   Test against local Supabase first.
--   Do not apply directly to production.
--   Do not modify the original attendance migration.

BEGIN;

-- Prevent concurrent attendance writes while reconciling.
LOCK TABLE
  public.attendance_sessions,
  public.attendance_records
IN ACCESS EXCLUSIVE MODE;

-- ============================================================
-- 1. Reconcile known duplicate attendance sessions
-- ============================================================

DO $migration$
DECLARE
  target_event uuid :=
    '1a75d927-1674-4d37-a7a7-8da9be7fcddf';

  retained_session uuid :=
    'fb462256-b71b-4f38-ba71-beda24540d5b';

  unused_session_one uuid :=
    'f4d1d0ce-86ce-453e-9631-9f2b0cab963a';

  unused_session_two uuid :=
    '01195262-0550-4ad7-8b72-af767c64605c';

  existing_count integer;
  deleted_count integer;
  removed_session uuid;
BEGIN

  SELECT count(*)
  INTO existing_count
  FROM public.attendance_sessions
  WHERE event_id = target_event;

  -- Fresh databases may not contain this specific beta event.
  -- An event with one session needs no reconciliation.
  IF existing_count IN (0, 1) THEN
    NULL;

  ELSIF existing_count = 3 THEN

    -- Verify the three expected session identifiers.
    IF (
      SELECT count(*)
      FROM public.attendance_sessions
      WHERE event_id = target_event
        AND id IN (
          retained_session,
          unused_session_one,
          unused_session_two
        )
    ) <> 3 THEN
      RAISE EXCEPTION
        'Migration stopped: unexpected attendance session IDs.';
    END IF;

    -- Verify the retained session.
    IF NOT EXISTS (
      SELECT 1
      FROM public.attendance_sessions
      WHERE id = retained_session
        AND event_id = target_event
        AND class_name = 'Youth Night Ministries'
        AND finalized_at IS NULL
    ) THEN
      RAISE EXCEPTION
        'Migration stopped: retained session mismatch.';
    END IF;

    -- Confirm the retained session has exactly two records,
    -- both marked present.
    IF (
      SELECT count(*)
      FROM public.attendance_records
      WHERE session_id = retained_session
    ) <> 2
    OR (
      SELECT count(*)
      FROM public.attendance_records
      WHERE session_id = retained_session
        AND status = 'present'
    ) <> 2 THEN
      RAISE EXCEPTION
        'Migration stopped: recorded attendance has changed.';
    END IF;

    -- Verify the two unused sessions.
    IF (
      SELECT count(*)
      FROM public.attendance_sessions
      WHERE event_id = target_event
        AND finalized_at IS NULL
        AND (
          (
            id = unused_session_one
            AND class_name = 'Youth Minitstires'
          )
          OR (
            id = unused_session_two
            AND class_name = 'Youth Ministries'
          )
        )
    ) <> 2 THEN
      RAISE EXCEPTION
        'Migration stopped: unused sessions mismatch.';
    END IF;

    -- Refuse reconciliation if either unused session
    -- contains attendance records.
    IF EXISTS (
      SELECT 1
      FROM public.attendance_records
      WHERE session_id IN (
        unused_session_one,
        unused_session_two
      )
    ) THEN
      RAISE EXCEPTION
        'Migration stopped: unused sessions contain records.';
    END IF;

    -- Reconcile the two unused sessions.
    FOREACH removed_session IN ARRAY ARRAY[
      unused_session_one,
      unused_session_two
    ]
    LOOP

      DELETE FROM public.attendance_sessions
      WHERE id = removed_session
        AND event_id = target_event;

      GET DIAGNOSTICS deleted_count = ROW_COUNT;

      IF deleted_count <> 1 THEN
        RAISE EXCEPTION
          'Migration stopped: expected session not deleted.';
      END IF;

      -- Preserve existing audit records.
      -- Add a dedicated migration reconciliation record.
      INSERT INTO public.audit_events (
        actor_profile_id,
        action,
        entity_type,
        entity_id,
        result,
        source,
        metadata
      )
      VALUES (
        NULL,
        'attendance.session_reconciled',
        'attendance_session',
        removed_session,
        'success',
        'migration',
        jsonb_build_object(
          'eventId', target_event,
          'retainedSessionId', retained_session,
          'retiredSessionId', removed_session,
          'reason', 'one_session_per_event',
          'migration', '202610180002',
          'performedBy', 'database_migration'
        )
      );

    END LOOP;

  ELSE
    RAISE EXCEPTION
      'Migration stopped: unexpected session count: %',
      existing_count;
  END IF;

  -- Ensure no other event has multiple sessions.
  IF EXISTS (
    SELECT 1
    FROM public.attendance_sessions
    GROUP BY event_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Migration stopped: another event has duplicate sessions.';
  END IF;

END;
$migration$;

-- ============================================================
-- 2. Enforce one attendance session per event
-- ============================================================

ALTER TABLE public.attendance_sessions
  DROP CONSTRAINT
    attendance_sessions_event_date_class_key;

ALTER TABLE public.attendance_sessions
  ADD CONSTRAINT attendance_sessions_event_id_key
  UNIQUE (event_id);

-- Preserve the existing event/date lookup index.
-- Preserve the session primary key.

-- ============================================================
-- 3. Update attendance session creation
-- ============================================================

-- Retain the existing five-parameter RPC signature
-- so the currently deployed application remains compatible.

CREATE OR REPLACE FUNCTION
public.create_attendance_session(
  p_event_id uuid,
  p_session_date date,
  p_class_name text,
  p_starts_at timestamp with time zone,
  p_ends_at timestamp with time zone
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $function$
DECLARE
  session_id uuid;
BEGIN

  -- Preserve existing authorization rules.
  IF NOT private.can_manage_event_attendance(
    p_event_id
  ) THEN
    RAISE EXCEPTION
      'Attendance session creation is denied.'
      USING errcode = '42501';
  END IF;

  -- Validate supplied details.
  IF NOT EXISTS (
    SELECT 1
    FROM public.events
    WHERE id = p_event_id
  )
    OR p_session_date IS NULL
    OR (
      (p_starts_at IS NULL)
      <> (p_ends_at IS NULL)
    )
    OR (
      p_starts_at IS NOT NULL
      AND p_ends_at <= p_starts_at
    )
    OR length(
      btrim(coalesce(p_class_name, ''))
    ) > 100
  THEN
    RAISE EXCEPTION
      'Invalid attendance session details.'
      USING errcode = '22023';
  END IF;

  -- Insert only if the event has no attendance session.
  INSERT INTO public.attendance_sessions (
    event_id,
    session_date,
    class_name,
    starts_at,
    ends_at,
    created_by_profile_id
  )
  VALUES (
    p_event_id,
    p_session_date,
    'General Attendance',
    p_starts_at,
    p_ends_at,
    (SELECT auth.uid())
  )
  ON CONFLICT (event_id) DO NOTHING
  RETURNING id INTO session_id;

  -- If one exists, return the existing session ID.
  -- Do not overwrite attendance or session details.
  IF session_id IS NULL THEN

    SELECT id
    INTO session_id
    FROM public.attendance_sessions
    WHERE event_id = p_event_id;

    IF session_id IS NULL THEN
      RAISE EXCEPTION
        'Existing attendance session could not be found.';
    END IF;

    RETURN session_id;

  END IF;

  -- Audit newly created sessions only.
  INSERT INTO public.audit_events (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  )
  VALUES (
    (SELECT auth.uid()),
    'attendance.session_created',
    'attendance_session',
    session_id,
    'success',
    'web',
    jsonb_build_object(
      'eventId', p_event_id,
      'sessionDate', p_session_date,
      'className', 'General Attendance'
    )
  );

  RETURN session_id;

END;
$function$;

-- ============================================================
-- 4. Preserve RPC execution permissions
-- ============================================================

REVOKE ALL ON FUNCTION
  public.create_attendance_session(
    uuid,
    date,
    text,
    timestamp with time zone,
    timestamp with time zone
  )
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.create_attendance_session(
    uuid,
    date,
    text,
    timestamp with time zone,
    timestamp with time zone
  )
TO authenticated;

-- ============================================================
-- 5. Final migration integrity verification
-- ============================================================

DO $verify$
DECLARE
  event_count integer;
BEGIN

  -- Every event must have at most one session.
  IF EXISTS (
    SELECT 1
    FROM public.attendance_sessions
    GROUP BY event_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Verification failed: duplicate attendance sessions.';
  END IF;

  -- Verify the original event when present.
  SELECT count(*)
  INTO event_count
  FROM public.attendance_sessions
  WHERE event_id =
    '1a75d927-1674-4d37-a7a7-8da9be7fcddf';

  IF event_count > 0 THEN

    -- Exactly one known session must remain.
    IF NOT EXISTS (
      SELECT 1
      FROM public.attendance_sessions
      WHERE id =
        'fb462256-b71b-4f38-ba71-beda24540d5b'
        AND event_id =
        '1a75d927-1674-4d37-a7a7-8da9be7fcddf'
    ) THEN
      RAISE EXCEPTION
        'Verification failed: retained session missing.';
    END IF;

    -- Preserve the two original present records.
    IF (
      SELECT count(*)
      FROM public.attendance_records
      WHERE session_id =
        'fb462256-b71b-4f38-ba71-beda24540d5b'
        AND status = 'present'
    ) <> 2 THEN
      RAISE EXCEPTION
        'Verification failed: attendance records changed.';
    END IF;

  END IF;

END;
$verify$;

COMMIT;
