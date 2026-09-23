begin;

-- Add the assignment's authoritative time window to the existing protected projection.
-- Authorization, visibility, tables, and RLS remain unchanged.
drop function public.list_ministry_schedules(timestamptz, timestamptz);

create function public.list_ministry_schedules(p_from timestamptz, p_until timestamptz)
returns table(schedule_id uuid,schedule_name text,ministry_context text,event_id uuid,schedule_status public.ministry_schedule_status,starts_at timestamptz,ends_at timestamptz,timezone text,notes text,position_id uuid,responsibility text,required_count integer,location_id uuid,location_name text,assignment_id uuid,profile_id uuid,volunteer_name text,assignment_status public.schedule_assignment_status,assignment_starts_at timestamptz,assignment_ends_at timestamptz,conflict_codes text[],conflict_overridden boolean)
language plpgsql stable security definer set search_path='' set row_security=off as $$
declare manager boolean:=private.can_manage_scheduling();
begin
 if not private.current_profile_is_active() or (not manager and not private.has_role(array['volunteer']::public.account_role[])) then raise exception 'Scheduling access is denied.' using errcode='42501'; end if;
 return query select s.id,s.name,s.ministry_context,s.event_id,s.status,s.starts_at,s.ends_at,s.timezone,s.notes,p.id,p.responsibility,p.required_count,l.id,l.name,a.id,a.profile_id,coalesce(nullif(concat_ws(' ',coalesce(nullif(person.preferred_name,''),person.first_name),person.last_name),''),pr.display_name),a.status,a.starts_at,a.ends_at,a.conflict_codes,a.conflict_overridden
 from public.ministry_schedules s left join public.schedule_positions p on p.schedule_id=s.id left join public.schedule_locations l on l.id=p.location_id left join public.schedule_assignments a on a.position_id=p.id and a.schedule_id=s.id and a.status<>'cancelled' and (manager or a.profile_id=auth.uid()) left join public.profiles pr on pr.id=a.profile_id left join public.people person on person.id=pr.person_id
 where s.starts_at < p_until and s.ends_at > p_from and (manager or (s.status='published' and a.profile_id=auth.uid())) order by s.starts_at,p.responsibility,coalesce(nullif(concat_ws(' ',coalesce(nullif(person.preferred_name,''),person.first_name),person.last_name),''),pr.display_name);
end $$;

revoke all on function public.list_ministry_schedules(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.list_ministry_schedules(timestamptz,timestamptz) to authenticated;

commit;
