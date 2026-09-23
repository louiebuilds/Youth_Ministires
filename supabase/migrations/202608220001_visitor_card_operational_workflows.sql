begin;

create or replace function private.prevent_visitor_card_intake_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - array['status','updated_at','archived_at','archived_by_profile_id'])
    is distinct from
    (to_jsonb(old) - array['status','updated_at','archived_at','archived_by_profile_id']) then
    raise exception 'Original Visitor Card intake evidence is immutable.' using errcode='55000';
  end if;
  return new;
end
$$;

create trigger visitor_cards_intake_immutable
before update on public.visitor_cards
for each row execute function private.prevent_visitor_card_intake_change();

create or replace function private.record_visitor_card_lifecycle(
  p_visitor_card_id uuid,
  p_review_action public.visitor_card_review_action,
  p_audit_action text,
  p_reason text,
  p_status public.visitor_card_status
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  insert into public.visitor_card_review_events(visitor_card_id,action,actor_profile_id,reason)
  values(p_visitor_card_id,p_review_action,auth.uid(),nullif(btrim(coalesce(p_reason,'')),''));
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),p_audit_action,'visitor_card',p_visitor_card_id,'success','web',
    jsonb_build_object('status',p_status,'reviewAction',p_review_action));
end
$$;

create or replace function public.create_staff_visitor_card(
  p_event_id uuid,
  p_visit_date date,
  p_youth_first_name text,
  p_youth_last_name text,
  p_guardian_name text,
  p_email text,
  p_phone text,
  p_grade_or_age_group text,
  p_invited_by text,
  p_how_heard text,
  p_follow_up_email boolean,
  p_follow_up_phone boolean,
  p_follow_up_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare result uuid;
begin
  if not private.has_forms_capability('visitor_cards.manage') then
    raise exception 'Visitor Card creation is denied.' using errcode='42501';
  end if;
  insert into public.visitor_cards(
    source,event_id,visit_date,youth_first_name,youth_last_name,guardian_name,email,phone,
    grade_or_age_group,invited_by,how_heard,follow_up_email,follow_up_phone,follow_up_notes,
    submitted_by_profile_id
  ) values(
    'staff',p_event_id,coalesce(p_visit_date,current_date),btrim(p_youth_first_name),btrim(p_youth_last_name),
    nullif(btrim(coalesce(p_guardian_name,'')),''),nullif(btrim(coalesce(p_email,'')),''),
    nullif(btrim(coalesce(p_phone,'')),''),nullif(btrim(coalesce(p_grade_or_age_group,'')),''),
    nullif(btrim(coalesce(p_invited_by,'')),''),nullif(btrim(coalesce(p_how_heard,'')),''),
    coalesce(p_follow_up_email,false),coalesce(p_follow_up_phone,false),
    nullif(btrim(coalesce(p_follow_up_notes,'')),''),auth.uid()
  ) returning id into result;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'visitor_cards.created','visitor_card',result,'success','web',jsonb_build_object('source','staff','status','new'));
  return result;
end
$$;

create or replace function public.list_visitor_cards(p_status public.visitor_card_status default null)
returns table(
  visitor_card_id uuid,visitor_name text,visit_date date,event_name text,source public.visitor_card_source,
  status public.visitor_card_status,has_email boolean,has_phone boolean,follow_up_email boolean,
  follow_up_phone boolean,created_at timestamptz
)
language plpgsql stable security definer set search_path='' set row_security=off
as $$
begin
  if not private.has_forms_capability('visitor_cards.manage') then
    raise exception 'Visitor Card listing is denied.' using errcode='42501';
  end if;
  return query select c.id,concat_ws(' ',c.youth_first_name,c.youth_last_name),c.visit_date,e.name,c.source,c.status,
    c.email is not null,c.phone is not null,c.follow_up_email,c.follow_up_phone,c.created_at
  from public.visitor_cards c left join public.events e on e.id=c.event_id
  where p_status is null or c.status=p_status
  order by case c.status when 'new' then 0 when 'under_review' then 1 when 'possible_duplicate' then 2
    when 'linked_existing' then 3 when 'conversion_started' then 4 else 5 end,c.visit_date desc,c.created_at desc;
end
$$;

create or replace function public.list_visitor_card_events()
returns table(event_id uuid,event_name text,starts_at timestamptz)
language plpgsql stable security definer set search_path='' set row_security=off
as $$
begin
  if not private.has_forms_capability('visitor_cards.manage') then
    raise exception 'Visitor Card Event listing is denied.' using errcode='42501';
  end if;
  return query select e.id,e.name,e.starts_at from public.events e
    where e.status in ('published','active','completed') and e.archived_at is null
      and e.starts_at >= now()-interval '1 year'
    order by e.starts_at desc limit 250;
end
$$;

create or replace function public.get_visitor_card_detail(p_visitor_card_id uuid)
returns jsonb
language plpgsql stable security definer set search_path='' set row_security=off
as $$
begin
  if not private.has_forms_capability('visitor_cards.manage') then
    raise exception 'Visitor Card detail access is denied.' using errcode='42501';
  end if;
  return (select jsonb_build_object(
    'visitorCardId',c.id,'source',c.source,'eventId',c.event_id,'eventName',e.name,'visitDate',c.visit_date,
    'youthFirstName',c.youth_first_name,'youthLastName',c.youth_last_name,'guardianName',c.guardian_name,
    'email',c.email,'phone',c.phone,'gradeOrAgeGroup',c.grade_or_age_group,'invitedBy',c.invited_by,
    'howHeard',c.how_heard,'followUpEmail',c.follow_up_email,'followUpPhone',c.follow_up_phone,
    'followUpNotes',c.follow_up_notes,'status',c.status,'submittedByProfileId',c.submitted_by_profile_id,
    'createdAt',c.created_at,'archivedAt',c.archived_at,
    'reviewHistory',coalesce((select jsonb_agg(jsonb_build_object('reviewEventId',r.id,'action',r.action,
      'actorProfileId',r.actor_profile_id,'reason',r.reason,'occurredAt',r.occurred_at) order by r.occurred_at,r.id)
      from public.visitor_card_review_events r where r.visitor_card_id=c.id),'[]'::jsonb),
    'links',coalesce((select jsonb_agg(jsonb_build_object('linkId',l.id,'linkType',l.link_type,'personId',l.person_id,
      'studentId',l.student_id,'householdId',l.household_id,'linkedByProfileId',l.linked_by_profile_id,
      'linkReason',l.link_reason,'linkedAt',l.linked_at) order by l.linked_at,l.id)
      from public.visitor_card_links l where l.visitor_card_id=c.id),'[]'::jsonb)
  ) from public.visitor_cards c left join public.events e on e.id=c.event_id where c.id=p_visitor_card_id);
end
$$;

create or replace function public.begin_visitor_card_review(p_visitor_card_id uuid)
returns void language plpgsql security definer set search_path='' set row_security=off
as $$ begin
  if not private.has_forms_capability('visitor_cards.manage') then raise exception 'Visitor Card review is denied.' using errcode='42501'; end if;
  update public.visitor_cards set status='under_review' where id=p_visitor_card_id and status='new';
  if not found then raise exception 'Only a new Visitor Card can begin review.' using errcode='22023'; end if;
  perform private.record_visitor_card_lifecycle(p_visitor_card_id,'review_started','visitor_cards.review_started',null,'under_review');
end $$;

create or replace function public.flag_visitor_card_possible_duplicate(p_visitor_card_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' set row_security=off
as $$ begin
  if not private.has_forms_capability('visitor_cards.manage') then raise exception 'Duplicate review is denied.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_reason,'')))<5 then raise exception 'An explicit duplicate-review reason is required.' using errcode='22023'; end if;
  update public.visitor_cards set status='possible_duplicate' where id=p_visitor_card_id and status in ('under_review','linked_existing');
  if not found then raise exception 'Visitor Card cannot be flagged from its current status.' using errcode='22023'; end if;
  perform private.record_visitor_card_lifecycle(p_visitor_card_id,'duplicate_flagged','visitor_cards.duplicate_flagged',p_reason,'possible_duplicate');
end $$;

create or replace function public.clear_visitor_card_duplicate(p_visitor_card_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' set row_security=off
as $$ begin
  if not private.has_forms_capability('visitor_cards.manage') then raise exception 'Duplicate review is denied.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_reason,'')))<5 then raise exception 'A duplicate-clear reason is required.' using errcode='22023'; end if;
  update public.visitor_cards set status='under_review' where id=p_visitor_card_id and status='possible_duplicate';
  if not found then raise exception 'Only a possible duplicate can be cleared.' using errcode='22023'; end if;
  perform private.record_visitor_card_lifecycle(p_visitor_card_id,'duplicate_cleared','visitor_cards.duplicate_cleared',p_reason,'under_review');
end $$;

create or replace function public.list_visitor_card_possible_matches(p_visitor_card_id uuid)
returns table(person_id uuid,student_id uuid,household_id uuid,display_name text,match_signals text[])
language plpgsql stable security definer set search_path='' set row_security=off
as $$
begin
  if not private.has_forms_capability('visitor_cards.manage') then raise exception 'Visitor match assistance is denied.' using errcode='42501'; end if;
  return query with card as(select * from public.visitor_cards where id=p_visitor_card_id), candidates as(
    select p.id person_id,s.id student_id,s.primary_household_id household_id,
      concat_ws(' ',coalesce(p.preferred_name,p.first_name),p.last_name) display_name,
      array_remove(array[
        case when lower(btrim(p.first_name))=lower(btrim(c.youth_first_name)) then 'first_name' end,
        case when lower(btrim(p.last_name))=lower(btrim(c.youth_last_name)) then 'last_name' end,
        case when c.email is not null and p.email is not null and lower(btrim(p.email))=lower(btrim(c.email)) then 'email' end,
        case when c.phone is not null and p.phone is not null and regexp_replace(p.phone,'[^0-9]','','g')=regexp_replace(c.phone,'[^0-9]','','g') then 'phone' end
      ],null)::text[] signals
    from card c join public.people p on p.status<>'archived'
    left join public.students s on s.person_id=p.id and s.status<>'archived'
    where (lower(btrim(p.first_name))=lower(btrim(c.youth_first_name)) and lower(btrim(p.last_name))=lower(btrim(c.youth_last_name)))
      or (c.email is not null and p.email is not null and lower(btrim(p.email))=lower(btrim(c.email)))
      or (c.phone is not null and p.phone is not null and regexp_replace(p.phone,'[^0-9]','','g')=regexp_replace(c.phone,'[^0-9]','','g'))
  ) select candidates.person_id,candidates.student_id,candidates.household_id,candidates.display_name,candidates.signals
    from candidates order by cardinality(candidates.signals) desc,candidates.display_name limit 25;
end
$$;

create or replace function public.link_visitor_card_existing(
  p_visitor_card_id uuid,p_link_type public.visitor_card_link_type,p_target_id uuid,p_reason text
)
returns uuid language plpgsql security definer set search_path='' set row_security=off
as $$ declare result uuid; begin
  if not private.has_forms_capability('visitor_cards.manage') then raise exception 'Visitor Card linking is denied.' using errcode='42501'; end if;
  if p_link_type not in ('person','student','household') then raise exception 'Use conversion evidence for conversion links.' using errcode='22023'; end if;
  if length(btrim(coalesce(p_reason,'')))<5 then raise exception 'An explicit link reason is required.' using errcode='22023'; end if;
  if not exists(select 1 from public.visitor_cards where id=p_visitor_card_id and status in ('under_review','possible_duplicate','linked_existing')) then
    raise exception 'Visitor Card cannot be linked from its current status.' using errcode='22023'; end if;
  insert into public.visitor_card_links(visitor_card_id,link_type,person_id,student_id,household_id,linked_by_profile_id,link_reason)
  values(p_visitor_card_id,p_link_type,case when p_link_type='person' then p_target_id end,
    case when p_link_type='student' then p_target_id end,case when p_link_type='household' then p_target_id end,auth.uid(),btrim(p_reason))
  returning id into result;
  update public.visitor_cards set status='linked_existing' where id=p_visitor_card_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'visitor_cards.existing_record_linked','visitor_card',p_visitor_card_id,'success','web',
    jsonb_build_object('linkId',result,'linkType',p_link_type,'status','linked_existing'));
  return result;
end $$;

create or replace function public.start_visitor_card_conversion(p_visitor_card_id uuid)
returns void language plpgsql security definer set search_path='' set row_security=off
as $$ begin
  if not private.has_forms_capability('visitor_cards.manage') then raise exception 'Visitor conversion is denied.' using errcode='42501'; end if;
  update public.visitor_cards set status='conversion_started' where id=p_visitor_card_id
    and status in ('under_review','possible_duplicate','linked_existing');
  if not found then raise exception 'Visitor conversion cannot start from the current status.' using errcode='22023'; end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'visitor_cards.conversion_started','visitor_card',p_visitor_card_id,'success','web',jsonb_build_object('status','conversion_started'));
end $$;

create or replace function public.record_visitor_card_conversion(
  p_visitor_card_id uuid,p_person_id uuid,p_student_id uuid,p_household_id uuid,p_reason text
)
returns uuid language plpgsql security definer set search_path='' set row_security=off
as $$ declare result uuid; begin
  if not private.has_forms_capability('visitor_cards.manage') then raise exception 'Visitor conversion evidence is denied.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_reason,'')))<5 or num_nonnulls(p_person_id,p_student_id,p_household_id)=0 then
    raise exception 'Conversion evidence and an explicit reason are required.' using errcode='22023'; end if;
  if not exists(select 1 from public.visitor_cards where id=p_visitor_card_id and status='conversion_started') then
    raise exception 'Visitor conversion has not been started.' using errcode='22023'; end if;
  insert into public.visitor_card_links(visitor_card_id,link_type,person_id,student_id,household_id,linked_by_profile_id,link_reason)
  values(p_visitor_card_id,'conversion',p_person_id,p_student_id,p_household_id,auth.uid(),btrim(p_reason)) returning id into result;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'visitor_cards.conversion_evidence_recorded','visitor_card',p_visitor_card_id,'success','web',
    jsonb_build_object('linkId',result,'linkType','conversion','status','conversion_started'));
  return result;
end $$;

create or replace function public.complete_visitor_card_conversion(p_visitor_card_id uuid)
returns void language plpgsql security definer set search_path='' set row_security=off
as $$ begin
  if not private.has_forms_capability('visitor_cards.manage') then raise exception 'Visitor conversion completion is denied.' using errcode='42501'; end if;
  update public.visitor_cards c set status='converted' where c.id=p_visitor_card_id and c.status='conversion_started'
    and exists(select 1 from public.visitor_card_links l where l.visitor_card_id=c.id and l.link_type='conversion');
  if not found then raise exception 'Valid retained conversion evidence is required.' using errcode='22023'; end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'visitor_cards.converted','visitor_card',p_visitor_card_id,'success','web',jsonb_build_object('status','converted'));
end $$;

create or replace function public.close_visitor_card(p_visitor_card_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' set row_security=off
as $$ begin
  if not private.has_forms_capability('visitor_cards.manage') then raise exception 'Visitor Card closure is denied.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_reason,'')))<5 then raise exception 'A closure reason is required.' using errcode='22023'; end if;
  update public.visitor_cards set status='closed' where id=p_visitor_card_id
    and status in ('new','under_review','possible_duplicate','linked_existing','conversion_started');
  if not found then raise exception 'Visitor Card cannot be closed from its current status.' using errcode='22023'; end if;
  perform private.record_visitor_card_lifecycle(p_visitor_card_id,'closed','visitor_cards.closed',p_reason,'closed');
end $$;

create or replace function public.reopen_visitor_card(p_visitor_card_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' set row_security=off
as $$ begin
  if not private.has_forms_capability('visitor_cards.manage') then raise exception 'Visitor Card reopening is denied.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_reason,'')))<5 then raise exception 'A reopening reason is required.' using errcode='22023'; end if;
  update public.visitor_cards set status='under_review' where id=p_visitor_card_id and status='closed';
  if not found then raise exception 'Only a closed Visitor Card can be reopened.' using errcode='22023'; end if;
  perform private.record_visitor_card_lifecycle(p_visitor_card_id,'reopened','visitor_cards.reopened',p_reason,'under_review');
end $$;

create or replace function public.archive_visitor_card(p_visitor_card_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' set row_security=off
as $$ begin
  if not private.has_forms_capability('visitor_cards.manage') then raise exception 'Visitor Card archival is denied.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_reason,'')))<5 then raise exception 'An archival reason is required.' using errcode='22023'; end if;
  update public.visitor_cards set status='archived',archived_at=now(),archived_by_profile_id=auth.uid()
    where id=p_visitor_card_id and status<>'archived';
  if not found then raise exception 'Active Visitor Card not found.' using errcode='P0002'; end if;
  perform private.record_visitor_card_lifecycle(p_visitor_card_id,'archived','visitor_cards.archived',p_reason,'archived');
end $$;

revoke all on function private.prevent_visitor_card_intake_change(),
  private.record_visitor_card_lifecycle(uuid,public.visitor_card_review_action,text,text,public.visitor_card_status)
  from public,anon,authenticated;

revoke all on function public.create_staff_visitor_card(uuid,date,text,text,text,text,text,text,text,text,boolean,boolean,text),
  public.list_visitor_cards(public.visitor_card_status),public.list_visitor_card_events(),public.get_visitor_card_detail(uuid),
  public.begin_visitor_card_review(uuid),public.flag_visitor_card_possible_duplicate(uuid,text),
  public.clear_visitor_card_duplicate(uuid,text),public.list_visitor_card_possible_matches(uuid),
  public.link_visitor_card_existing(uuid,public.visitor_card_link_type,uuid,text),public.start_visitor_card_conversion(uuid),
  public.record_visitor_card_conversion(uuid,uuid,uuid,uuid,text),public.complete_visitor_card_conversion(uuid),
  public.close_visitor_card(uuid,text),public.reopen_visitor_card(uuid,text),public.archive_visitor_card(uuid,text)
  from public,anon,authenticated;

grant execute on function public.create_staff_visitor_card(uuid,date,text,text,text,text,text,text,text,text,boolean,boolean,text),
  public.list_visitor_cards(public.visitor_card_status),public.list_visitor_card_events(),public.get_visitor_card_detail(uuid),
  public.begin_visitor_card_review(uuid),public.flag_visitor_card_possible_duplicate(uuid,text),
  public.clear_visitor_card_duplicate(uuid,text),public.list_visitor_card_possible_matches(uuid),
  public.link_visitor_card_existing(uuid,public.visitor_card_link_type,uuid,text),public.start_visitor_card_conversion(uuid),
  public.record_visitor_card_conversion(uuid,uuid,uuid,uuid,text),public.complete_visitor_card_conversion(uuid),
  public.close_visitor_card(uuid,text),public.reopen_visitor_card(uuid,text),public.archive_visitor_card(uuid,text)
  to authenticated;

commit;
