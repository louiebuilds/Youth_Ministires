begin;

create or replace function private.can_view_reports()
returns boolean language sql stable security definer
set search_path = '' set row_security = off
as $$
  select private.current_profile_is_active()
    and private.has_role(array[
      'platform_administrator','youth_pastor','staff_member'
    ]::public.account_role[])
$$;

create or replace function private.validate_reporting_range(
  p_from date, p_to date
) returns void language plpgsql stable security definer
set search_path = '' set row_security = off as $$
begin
  if not private.can_view_reports() then
    raise exception 'Reporting access is denied.' using errcode='42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to-p_from > 366 then
    raise exception 'Reporting range is invalid.' using errcode='22023';
  end if;
end $$;

create or replace function public.list_attendance_report_trends(
  p_from date, p_to date, p_interval text default 'week'
) returns table(bucket_start date, attendance_count bigint, unique_youth bigint)
language plpgsql stable security definer set search_path='' set row_security=off as $$
begin
  perform private.validate_reporting_range(p_from,p_to);
  if p_interval not in ('week','month') then
    raise exception 'Reporting interval is invalid.' using errcode='22023';
  end if;
  return query
  select greatest(date_trunc(p_interval,s.session_date::timestamp)::date,p_from),
    count(*), count(distinct (r.student_id,s.session_date))
  from public.attendance_sessions s
  join public.attendance_records r on r.session_id=s.id
  where s.finalized_at is not null and r.status='present'
    and s.session_date between p_from and p_to
  group by 1 order by 1;
end $$;

create or replace function public.get_attendance_visitor_summary(
  p_from date, p_to date
) returns jsonb language plpgsql stable security definer
set search_path='' set row_security=off as $$
declare result jsonb;
begin
  perform private.validate_reporting_range(p_from,p_to);
  select jsonb_build_object(
    'attendanceCount',count(*),
    'uniqueYouth',count(distinct (r.student_id,s.session_date)),
    'firstTimeParticipants',count(distinct r.student_id) filter (
      where s.session_date=(select min(fs.session_date)
        from public.attendance_sessions fs join public.attendance_records fr on fr.session_id=fs.id
        where fs.finalized_at is not null and fr.status='present' and fr.student_id=r.student_id)
    ),
    'firstTimeVisitorActivity',(select count(*) from public.visitor_check_ins v
      join public.events e on e.id=v.event_id
      where (e.starts_at at time zone e.timezone)::date between p_from and p_to)
  ) into result
  from public.attendance_sessions s join public.attendance_records r on r.session_id=s.id
  where s.finalized_at is not null and r.status='present'
    and s.session_date between p_from and p_to;
  return result;
end $$;

create or replace function public.list_event_report_summary(
  p_from date, p_to date
) returns table(
  event_id uuid,event_name text,event_type text,starts_at timestamptz,capacity integer,
  registered_count bigint,waitlisted_count bigint,cancelled_count bigint,
  attendance_count bigint,capacity_utilization numeric,volunteer_staffing bigint
) language plpgsql stable security definer set search_path='' set row_security=off as $$
begin
  perform private.validate_reporting_range(p_from,p_to);
  return query select e.id,e.name,e.event_type,e.starts_at,e.capacity,
    count(distinct er.id) filter(where er.status in('registered','confirmed','completed')),
    count(distinct er.id) filter(where er.status='waitlisted'),
    count(distinct er.id) filter(where er.status='cancelled'),
    count(distinct ar.student_id) filter(where ats.finalized_at is not null and ar.status='present'),
    case when e.capacity is null or e.capacity=0 then null else round(
      100.0*count(distinct er.id) filter(where er.status in('registered','confirmed','completed'))/e.capacity,1
    ) end,
    case when exists(select 1 from public.ministry_schedules ms where ms.event_id=e.id)
      then (select count(*) from public.schedule_assignments sa join public.ministry_schedules ms on ms.id=sa.schedule_id
        where ms.event_id=e.id and ms.status<>'cancelled' and sa.status<>'cancelled')
      else (select count(*) from public.event_volunteer_assignments eva
        where eva.event_id=e.id and eva.status<>'cancelled') end
  from public.events e
  left join public.event_registrations er on er.event_id=e.id
  left join public.attendance_sessions ats on ats.event_id=e.id
  left join public.attendance_records ar on ar.session_id=ats.id
  where (e.starts_at at time zone e.timezone)::date between p_from and p_to
    and e.status<>'archived'
  group by e.id order by e.starts_at desc;
end $$;

create or replace function public.list_event_participation_trends(
  p_from date,p_to date,p_interval text default 'month'
) returns table(bucket_start date,registration_count bigint,attendance_count bigint)
language plpgsql stable security definer set search_path='' set row_security=off as $$
begin
  perform private.validate_reporting_range(p_from,p_to);
  if p_interval not in ('week','month') then raise exception 'Reporting interval is invalid.' using errcode='22023'; end if;
  return query select greatest(date_trunc(p_interval,e.starts_at at time zone e.timezone)::date,p_from),
    count(distinct er.id) filter(where er.status in('registered','confirmed','completed')),
    count(distinct (ats.event_id,ar.student_id)) filter(where ats.finalized_at is not null and ar.status='present')
  from public.events e left join public.event_registrations er on er.event_id=e.id
  left join public.attendance_sessions ats on ats.event_id=e.id
  left join public.attendance_records ar on ar.session_id=ats.id
  where (e.starts_at at time zone e.timezone)::date between p_from and p_to and e.status<>'archived'
  group by 1 order by 1;
end $$;

create or replace function public.list_volunteer_assignment_activity(
  p_from date,p_to date
) returns table(
  source text,assignment_id uuid,profile_id uuid,volunteer_name text,
  responsibility text,assignment_status text,starts_at timestamptz,event_name text
) language plpgsql stable security definer set search_path='' set row_security=off as $$
begin
  perform private.validate_reporting_range(p_from,p_to);
  return query
  select 'scheduling',sa.id,sa.profile_id,
    coalesce(nullif(concat_ws(' ',coalesce(nullif(pe.preferred_name,''),pe.first_name),pe.last_name),''),pr.display_name),
    sa.responsibility,sa.status::text,sa.starts_at,coalesce(e.name,ms.name)
  from public.schedule_assignments sa join public.ministry_schedules ms on ms.id=sa.schedule_id
  join public.profiles pr on pr.id=sa.profile_id left join public.people pe on pe.id=pr.person_id
  left join public.events e on e.id=ms.event_id
  where (sa.starts_at at time zone ms.timezone)::date between p_from and p_to
  union all
  select 'legacy_event',eva.id,eva.profile_id,
    coalesce(nullif(concat_ws(' ',coalesce(nullif(pe.preferred_name,''),pe.first_name),pe.last_name),''),pr.display_name),
    eva.assignment_role,eva.status::text,coalesce(eva.starts_at,e.starts_at),e.name
  from public.event_volunteer_assignments eva join public.events e on e.id=eva.event_id
  join public.profiles pr on pr.id=eva.profile_id left join public.people pe on pe.id=pr.person_id
  where (e.starts_at at time zone e.timezone)::date between p_from and p_to
    and not exists(select 1 from public.ministry_schedules ms where ms.event_id=e.id)
  order by starts_at desc;
end $$;

create or replace function public.list_scheduling_coverage_report(
  p_from date,p_to date
) returns table(
  schedule_id uuid,schedule_name text,starts_at timestamptz,schedule_status text,
  required_positions bigint,filled_positions bigint,unfilled_positions bigint,coverage_percentage numeric
) language plpgsql stable security definer set search_path='' set row_security=off as $$
begin
  perform private.validate_reporting_range(p_from,p_to);
  return query select ms.id,ms.name,ms.starts_at,ms.status::text,
    coalesce(sum(sp.required_count),0)::bigint,
    count(sa.id) filter(where sa.status<>'cancelled'),
    greatest(coalesce(sum(sp.required_count),0)-count(sa.id) filter(where sa.status<>'cancelled'),0)::bigint,
    case when coalesce(sum(sp.required_count),0)=0 then 100.0 else round(
      least(100.0,100.0*count(sa.id) filter(where sa.status<>'cancelled')/sum(sp.required_count)),1
    ) end
  from public.ministry_schedules ms left join public.schedule_positions sp on sp.schedule_id=ms.id
  left join public.schedule_assignments sa on sa.position_id=sp.id and sa.status<>'cancelled'
  where (ms.starts_at at time zone ms.timezone)::date between p_from and p_to and ms.status<>'cancelled'
  group by ms.id order by ms.starts_at;
end $$;

create or replace function public.get_growth_report_summary(
  p_from date,p_to date
) returns jsonb language plpgsql stable security definer set search_path='' set row_security=off as $$
declare result jsonb;
begin
  perform private.validate_reporting_range(p_from,p_to);
  select jsonb_build_object(
    'activeYouth',(select count(*) from public.students where status='active'),
    'newYouthAdded',(select count(*) from public.students where created_at::date between p_from and p_to),
    'activeHouseholds',(select count(*) from public.households where status='active'),
    'newHouseholds',(select count(*) from public.households where created_at::date between p_from and p_to),
    'firstTimeParticipants',(select count(distinct r.student_id)
      from public.attendance_records r join public.attendance_sessions s on s.id=r.session_id
      where s.finalized_at is not null and r.status='present' and s.session_date between p_from and p_to
        and s.session_date=(select min(fs.session_date) from public.attendance_records fr
          join public.attendance_sessions fs on fs.id=fr.session_id
          where fr.student_id=r.student_id and fr.status='present' and fs.finalized_at is not null)),
    'firstTimeVisitorActivity',(select count(*) from public.visitor_check_ins v join public.events e on e.id=v.event_id
      where (e.starts_at at time zone e.timezone)::date between p_from and p_to),
    'eventAttendance',(select count(distinct (ar.student_id,ats.event_id)) from public.attendance_records ar
      join public.attendance_sessions ats on ats.id=ar.session_id
      where ats.finalized_at is not null and ar.status='present' and ats.session_date between p_from and p_to)
  ) into result;
  return result;
end $$;

create or replace function public.get_reporting_overview(p_from date,p_to date)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=off as $$
declare a jsonb;g jsonb;required_count bigint;filled_count bigint;upcoming bigint;registrations bigint;upcoming_assignments bigint;
begin
  perform private.validate_reporting_range(p_from,p_to);
  a:=public.get_attendance_visitor_summary(p_from,p_to);
  g:=public.get_growth_report_summary(p_from,p_to);
  select coalesce(sum(sp.required_count),0),count(sa.id) filter(where sa.status<>'cancelled')
    into required_count,filled_count from public.ministry_schedules ms
    left join public.schedule_positions sp on sp.schedule_id=ms.id
    left join public.schedule_assignments sa on sa.position_id=sp.id and sa.status<>'cancelled'
    where ms.status<>'cancelled' and (ms.starts_at at time zone ms.timezone)::date between p_from and p_to;
  select count(*) into upcoming from public.events where status in('published','active') and starts_at>=now();
  select count(*) into registrations from public.event_registrations er join public.events e on e.id=er.event_id
    where er.status in('registered','confirmed','completed') and (e.starts_at at time zone e.timezone)::date between p_from and p_to;
  select (select count(*) from public.schedule_assignments sa where sa.status<>'cancelled' and sa.starts_at>=now())+
    (select count(*) from public.event_volunteer_assignments eva join public.events e on e.id=eva.event_id
      where eva.status<>'cancelled' and coalesce(eva.starts_at,e.starts_at)>=now()
      and not exists(select 1 from public.ministry_schedules ms where ms.event_id=e.id)) into upcoming_assignments;
  return a||g||jsonb_build_object('upcomingEvents',upcoming,'registrations',registrations,
    'upcomingAssignments',upcoming_assignments,
    'requiredPositions',required_count,'filledPositions',filled_count,
    'unfilledPositions',greatest(required_count-filled_count,0),
    'coveragePercentage',case when required_count=0 then 100 else round(100.0*filled_count/required_count,1) end,
    'fromDate',p_from,'toDate',p_to);
end $$;

create or replace function public.list_my_saved_reports()
returns table(id uuid,name text,report_type text,configuration jsonb,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path='' set row_security=off as $$
begin
  if not private.can_view_reports() then raise exception 'Reporting access is denied.' using errcode='42501'; end if;
  return query select r.id,r.name,r.report_type,r.configuration,r.created_at,r.updated_at
    from public.report_saved_configurations r where r.creator_profile_id=auth.uid() and r.archived_at is null
    order by lower(r.name);
end $$;

create or replace function public.create_saved_report(p_name text,p_report_type text,p_configuration jsonb)
returns uuid language plpgsql security definer set search_path='' set row_security=off as $$ declare new_id uuid;
begin
  if not private.can_view_reports() then raise exception 'Reporting access is denied.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_name,''))) not between 1 and 120 or p_report_type not in('overview','attendance','events','volunteers','growth','ministry_health')
    or jsonb_typeof(coalesce(p_configuration,'null'::jsonb))<>'object' or pg_column_size(p_configuration)>16384 then raise exception 'Saved report is invalid.' using errcode='22023'; end if;
  insert into public.report_saved_configurations(creator_profile_id,name,report_type,configuration)
    values(auth.uid(),btrim(p_name),p_report_type,p_configuration) returning id into new_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
    values(auth.uid(),'reporting.saved_report_created','report_saved_configuration',new_id,'success','web',jsonb_build_object('reportType',p_report_type));
  return new_id;
end $$;

create or replace function public.rename_saved_report(p_id uuid,p_name text)
returns void language plpgsql security definer set search_path='' set row_security=off as $$
begin
  if not private.can_view_reports() or length(btrim(coalesce(p_name,''))) not between 1 and 120 then raise exception 'Saved report is invalid.' using errcode='22023'; end if;
  update public.report_saved_configurations set name=btrim(p_name) where id=p_id and creator_profile_id=auth.uid() and archived_at is null;
  if not found then raise exception 'Saved report not found.' using errcode='P0002'; end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'reporting.saved_report_renamed','report_saved_configuration',p_id,'success','web','{}');
end $$;

create or replace function public.archive_saved_report(p_id uuid)
returns void language plpgsql security definer set search_path='' set row_security=off as $$
begin
  if not private.can_view_reports() then raise exception 'Reporting access is denied.' using errcode='42501'; end if;
  update public.report_saved_configurations set archived_at=now() where id=p_id and creator_profile_id=auth.uid() and archived_at is null;
  if not found then raise exception 'Saved report not found.' using errcode='P0002'; end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'reporting.saved_report_archived','report_saved_configuration',p_id,'success','web','{}');
end $$;

create or replace function public.record_reporting_export(p_report_type text,p_format text,p_from date,p_to date,p_row_count integer)
returns void language plpgsql security definer set search_path='' set row_security=off as $$
begin
  perform private.validate_reporting_range(p_from,p_to);
  if p_report_type not in('overview','attendance','events','volunteers','growth','ministry_health') or p_format not in('csv','xlsx') or p_row_count<0 or p_row_count>10000 then raise exception 'Export request is invalid.' using errcode='22023'; end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,result,source,metadata)
    values(auth.uid(),'reporting.export_generated','report_export','success','web',jsonb_build_object('reportType',p_report_type,'format',p_format,'from',p_from,'to',p_to,'rowCount',p_row_count));
end $$;

revoke all on function private.can_view_reports(),private.validate_reporting_range(date,date) from public,anon,authenticated;
revoke all on function public.list_attendance_report_trends(date,date,text),public.get_attendance_visitor_summary(date,date),public.list_event_report_summary(date,date),public.list_event_participation_trends(date,date,text),public.list_volunteer_assignment_activity(date,date),public.list_scheduling_coverage_report(date,date),public.get_growth_report_summary(date,date),public.get_reporting_overview(date,date),public.list_my_saved_reports(),public.create_saved_report(text,text,jsonb),public.rename_saved_report(uuid,text),public.archive_saved_report(uuid),public.record_reporting_export(text,text,date,date,integer) from public,anon,authenticated;
grant execute on function public.list_attendance_report_trends(date,date,text),public.get_attendance_visitor_summary(date,date),public.list_event_report_summary(date,date),public.list_event_participation_trends(date,date,text),public.list_volunteer_assignment_activity(date,date),public.list_scheduling_coverage_report(date,date),public.get_growth_report_summary(date,date),public.get_reporting_overview(date,date),public.list_my_saved_reports(),public.create_saved_report(text,text,jsonb),public.rename_saved_report(uuid,text),public.archive_saved_report(uuid),public.record_reporting_export(text,text,date,date,integer) to authenticated;

commit;
