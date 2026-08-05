begin;

alter table public.prayer_requests
  drop constraint prayer_requests_answered_check;

alter table public.prayer_requests
  add constraint prayer_requests_answered_check check (
    (
      status = 'answered'
      and answered_at is not null
      and answered_by_profile_id is not null
    )
    or (
      status = 'active'
      and answered_at is null
      and answered_by_profile_id is null
      and answer_summary is null
    )
    or (
      status = 'archived'
      and (
        (
          answered_at is null
          and answered_by_profile_id is null
          and answer_summary is null
        )
        or (
          answered_at is not null
          and answered_by_profile_id is not null
        )
      )
    )
  );

create or replace function public.archive_prayer_request(p_prayer_request_id uuid)
returns void
language plpgsql volatile security definer set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care management denied.' using errcode = '42501';
  end if;
  update public.prayer_requests
  set status = 'archived', archived_at = now(), updated_at = now()
  where id = p_prayer_request_id and status <> 'archived';
  if not found then
    raise exception 'Prayer request not found or already archived.' using errcode = 'P0002';
  end if;
  perform private.write_care_audit('prayer_request.archived', 'prayer_request', p_prayer_request_id);
end;
$$;

comment on function public.archive_prayer_request(uuid) is
  'Archives a prayer request without deleting answered-prayer history.';

commit;
