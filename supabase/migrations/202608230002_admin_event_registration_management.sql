begin;

create or replace function public.list_my_event_registration_options(p_event_id uuid)
returns table(student_id uuid,student_name text,household_id uuid,household_name text,registration_id uuid,registration_status public.event_registration_status)
language plpgsql stable security definer set search_path='' set row_security=off as $$ begin
  if not private.current_profile_is_active() then raise exception 'Registration access is denied.' using errcode='42501'; end if;
  if not exists(select 1 from public.events where id=p_event_id and status in ('published','active')) then raise exception 'This event is unavailable for registration.' using errcode='22023'; end if;
  if private.current_profile_role()='platform_administrator' then
    return query select s.id,btrim(p.first_name||' '||p.last_name),h.id,h.name,r.id,r.status from public.students s
    join public.people p on p.id=s.person_id join public.households h on h.id=s.primary_household_id and h.status='active'
    left join public.event_registrations r on r.event_id=p_event_id and r.student_id=s.id where s.status='active' order by p.last_name,p.first_name;
  else
    return query select s.id,btrim(p.first_name||' '||p.last_name),h.id,h.name,r.id,r.status from public.profiles profile
    join public.student_relationships sr on sr.person_id=profile.person_id and (sr.may_view_student_information or sr.may_sign_permission_forms or sr.is_legal_guardian)
    join public.students s on s.id=sr.student_id and s.status='active' join public.people p on p.id=s.person_id
    join public.households h on h.id=s.primary_household_id and h.status='active'
    left join public.event_registrations r on r.event_id=p_event_id and r.student_id=s.id where profile.id=auth.uid() order by p.last_name,p.first_name;
  end if;
end $$;
create or replace function public.register_my_student_for_event(p_event_id uuid,p_student_id uuid)
returns public.event_registration_status language plpgsql security definer set search_path='' set row_security=off as $$
declare selected_event public.events%rowtype; selected_household_id uuid; existing_registration public.event_registrations%rowtype;
 registered_count bigint; waitlisted_count bigint; new_status public.event_registration_status; new_waitlist_position bigint; registration_id uuid; begin
  if not private.current_profile_is_active() then raise exception 'Registration access is denied.' using errcode='42501'; end if;
  select * into selected_event from public.events where id=p_event_id and status in ('published','active') for update;
  if not found then raise exception 'This event is unavailable for registration.' using errcode='22023'; end if;
  if selected_event.registration_opens_at is not null and now()<selected_event.registration_opens_at then raise exception 'Registration has not opened.' using errcode='22023'; end if;
  if selected_event.registration_closes_at is not null and now()>selected_event.registration_closes_at then raise exception 'Registration has closed.' using errcode='22023'; end if;
  if private.current_profile_role()='platform_administrator' then
    select s.primary_household_id into selected_household_id from public.students s join public.households h on h.id=s.primary_household_id and h.status='active' where s.id=p_student_id and s.status='active';
  else
    select s.primary_household_id into selected_household_id from public.students s join public.households h on h.id=s.primary_household_id and h.status='active'
    join public.student_relationships sr on sr.student_id=s.id and (sr.may_view_student_information or sr.may_sign_permission_forms or sr.is_legal_guardian)
    join public.profiles p on p.person_id=sr.person_id where s.id=p_student_id and s.status='active' and p.id=auth.uid();
  end if;
  if selected_household_id is null then raise exception 'Student registration access is denied.' using errcode='42501'; end if;
  select * into existing_registration from public.event_registrations where event_id=p_event_id and student_id=p_student_id for update;
  if found and existing_registration.status<>'cancelled' then raise exception 'This student is already registered or waitlisted.' using errcode='22023'; end if;
  select count(*) into registered_count from public.event_registrations where event_id=p_event_id and status in ('registered','confirmed','completed');
  if selected_event.capacity is null or registered_count<selected_event.capacity then new_status:='registered';new_waitlist_position:=null;
  else select count(*),coalesce(max(waitlist_position),0)+1 into waitlisted_count,new_waitlist_position from public.event_registrations where event_id=p_event_id and status='waitlisted';
    if selected_event.waitlist_capacity is null or waitlisted_count>=selected_event.waitlist_capacity then raise exception 'This event and its waitlist are full.' using errcode='22023'; end if;
    new_status:='waitlisted'; end if;
  if existing_registration.id is not null then update public.event_registrations set household_id=selected_household_id,status=new_status,waitlist_position=new_waitlist_position,
    notes=null,created_by_profile_id=auth.uid(),cancelled_at=null,cancelled_by_profile_id=null,updated_at=now() where id=existing_registration.id returning id into registration_id;
  else insert into public.event_registrations(event_id,household_id,student_id,status,waitlist_position,created_by_profile_id)
    values(p_event_id,selected_household_id,p_student_id,new_status,new_waitlist_position,auth.uid()) returning id into registration_id; end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
    values(auth.uid(),'event.registration_created','event_registration',registration_id,'success','web',jsonb_build_object('eventId',p_event_id,'status',new_status));
  return new_status;
end $$;
create or replace function public.cancel_my_event_registration(p_registration_id uuid)
returns void language plpgsql security definer set search_path='' set row_security=off as $$
declare selected_registration public.event_registrations%rowtype; begin
  if not private.current_profile_is_active() then raise exception 'Registration access is denied.' using errcode='42501'; end if;
  if private.current_profile_role()='platform_administrator' then
    select * into selected_registration from public.event_registrations where id=p_registration_id for update;
  else
    select r.* into selected_registration from public.event_registrations r join public.students s on s.id=r.student_id
    join public.student_relationships sr on sr.student_id=s.id and (sr.may_view_student_information or sr.may_sign_permission_forms or sr.is_legal_guardian)
    join public.profiles p on p.person_id=sr.person_id where r.id=p_registration_id and p.id=auth.uid() for update of r;
  end if;
  if not found then raise exception 'Registration access is denied.' using errcode='42501'; end if;
  if selected_registration.status not in ('registered','waitlisted','confirmed') then raise exception 'This registration cannot be cancelled.' using errcode='22023'; end if;
  update public.event_registrations set status='cancelled',waitlist_position=null,cancelled_at=now(),cancelled_by_profile_id=auth.uid(),updated_at=now() where id=p_registration_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
    values(auth.uid(),'event.registration_cancelled','event_registration',p_registration_id,'success','web',jsonb_build_object('eventId',selected_registration.event_id,'priorStatus',selected_registration.status));
end $$;
revoke all on function public.list_my_event_registration_options(uuid),
  public.register_my_student_for_event(uuid,uuid),
  public.cancel_my_event_registration(uuid)
  from public,anon,authenticated;

grant execute on function public.list_my_event_registration_options(uuid),
  public.register_my_student_for_event(uuid,uuid),
  public.cancel_my_event_registration(uuid)
  to authenticated;
commit;
