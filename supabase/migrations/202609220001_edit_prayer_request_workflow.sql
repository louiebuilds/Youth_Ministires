begin;

-- Installed migrations are immutable. Replace the original five-argument
-- workflow with the approved edit contract, which also permits changing the
-- linked person while retaining the existing prayer-request identifier.
drop function if exists public.update_prayer_request(
  uuid,
  uuid,
  text,
  text,
  public.prayer_request_visibility
);

create function public.update_prayer_request(
  p_prayer_request_id uuid,
  p_person_id uuid,
  p_category_id uuid,
  p_title text,
  p_request_details text,
  p_visibility public.prayer_request_visibility
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care management denied.'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception 'Prayer request title must contain between 1 and 200 characters.'
      using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_request_details, ''))) not between 1 and 10000 then
    raise exception 'Prayer request details must contain between 1 and 10000 characters.'
      using errcode = '22023';
  end if;

  if p_visibility is null then
    raise exception 'Prayer request visibility is required.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.people p
    where p.id = p_person_id and p.status <> 'archived'
  ) then
    raise exception 'Person not found or archived.'
      using errcode = 'P0002';
  end if;

  if p_category_id is not null and not exists (
    select 1 from public.care_categories c
    where c.id = p_category_id and c.archived_at is null and c.is_active
  ) then
    raise exception 'Active care category not found.'
      using errcode = 'P0002';
  end if;

  update public.prayer_requests
  set
    person_id = p_person_id,
    category_id = p_category_id,
    title = btrim(p_title),
    request_details = btrim(p_request_details),
    visibility = p_visibility,
    updated_at = now()
  where id = p_prayer_request_id
    and status = 'active';

  if not found then
    raise exception 'Active prayer request not found.'
      using errcode = 'P0002';
  end if;

  perform private.write_care_audit(
    'prayer_request.updated',
    'prayer_request',
    p_prayer_request_id,
    jsonb_build_object(
      'visibility', p_visibility,
      'fields', jsonb_build_array(
        'person_id',
        'category_id',
        'title',
        'request_details',
        'visibility'
      )
    )
  );
end;
$$;

revoke all on function public.update_prayer_request(
  uuid,
  uuid,
  uuid,
  text,
  text,
  public.prayer_request_visibility
) from public, anon;

grant execute on function public.update_prayer_request(
  uuid,
  uuid,
  uuid,
  text,
  text,
  public.prayer_request_visibility
) to authenticated;

comment on function public.update_prayer_request(
  uuid,
  uuid,
  uuid,
  text,
  text,
  public.prayer_request_visibility
) is
  'Edits an active prayer request for Prayer and Care managers while preserving its identifier and writing content-free audit metadata.';

commit;
