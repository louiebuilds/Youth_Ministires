begin;

create or replace function private.require_document_template_manager()
returns void language plpgsql stable security definer set search_path='' as $$ begin
  if not private.has_forms_capability('forms.documents.manage') then
    raise exception 'Document template management is denied.' using errcode='42501';
  end if;
end $$;

create or replace function public.create_document_template(p_name text,p_description text,p_document_kind public.document_kind)
returns uuid language plpgsql security definer set search_path='' set row_security=off as $$ declare new_id uuid; begin
  perform private.require_document_template_manager();
  if length(btrim(coalesce(p_name,''))) not between 1 and 200 then raise exception 'Template name is invalid.' using errcode='22023'; end if;
  insert into public.document_templates(name,description,document_kind,status,created_by_profile_id)
  values(btrim(p_name),nullif(btrim(coalesce(p_description,'')),''),p_document_kind,'active',auth.uid()) returning id into new_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'forms.template_created','document_template',new_id,'success','web',jsonb_build_object('documentKind',p_document_kind));
  return new_id;
end $$;

create or replace function public.create_document_template_version(
  p_template_id uuid,p_validity_policy public.document_validity_policy,p_valid_for interval default null,
  p_explicit_expires_on date default null,p_effective_from date default null,p_effective_to date default null)
returns uuid language plpgsql security definer set search_path='' set row_security=off as $$ declare new_id uuid; next_number integer; begin
  perform private.require_document_template_manager();
  perform 1 from public.document_templates where id=p_template_id and status='active' for update;
  if not found then raise exception 'Active template not found.' using errcode='P0002'; end if;
  select coalesce(max(version_number),0)+1 into next_number from public.document_template_versions where template_id=p_template_id;
  insert into public.document_template_versions(template_id,version_number,validity_policy,valid_for,
    explicit_expires_on,effective_from,effective_to,created_by_profile_id)
  values(p_template_id,next_number,p_validity_policy,p_valid_for,p_explicit_expires_on,p_effective_from,p_effective_to,auth.uid()) returning id into new_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'forms.template_version_draft_created','document_template_version',new_id,'success','web',
    jsonb_build_object('templateId',p_template_id,'versionNumber',next_number));
  return new_id;
end $$;

create or replace function public.update_document_template_version_draft(
  p_version_id uuid,p_validity_policy public.document_validity_policy,p_valid_for interval default null,
  p_explicit_expires_on date default null,p_effective_from date default null,p_effective_to date default null)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ declare selected record; begin
  perform private.require_document_template_manager();
  select template_id,version_number,status into selected
  from public.document_template_versions where id=p_version_id for update;
  if not found or selected.status<>'draft' then
    raise exception 'Draft template version not found.' using errcode='P0002';
  end if;
  update public.document_template_versions set validity_policy=p_validity_policy,valid_for=p_valid_for,
    explicit_expires_on=p_explicit_expires_on,effective_from=p_effective_from,effective_to=p_effective_to
  where id=p_version_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'forms.template_version_draft_updated','document_template_version',p_version_id,'success','web',
    jsonb_build_object('templateId',selected.template_id,'versionNumber',selected.version_number));
end $$;

create or replace function public.prepare_document_template_master_upload(p_version_id uuid,p_object_id uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=off as $$ declare selected record; object_path text; begin
  perform private.require_document_template_manager();
  select id,template_id,status,blank_storage_object_path into selected from public.document_template_versions where id=p_version_id for update;
  if not found or selected.status<>'draft' then
    raise exception 'Draft version is unavailable for a master upload.' using errcode='22023';
  end if;
  if selected.blank_storage_object_path is not null then
    return jsonb_build_object('bucket','form-template-masters','objectPath',selected.blank_storage_object_path);
  end if;
  object_path:='templates/'||selected.template_id::text||'/'||selected.id::text||'/'||p_object_id::text||'.pdf';
  update public.document_template_versions set blank_storage_bucket='form-template-masters',blank_storage_object_path=object_path where id=p_version_id;
  return jsonb_build_object('bucket','form-template-masters','objectPath',object_path);
end $$;

create or replace function public.finalize_document_template_master_upload(
  p_version_id uuid,p_actor_profile_id uuid,p_original_file_name text,p_content_type text,
  p_file_size_bytes bigint,p_checksum_sha256 text)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ declare selected record; stored record; begin
  if auth.role()<>'service_role' then
    raise exception 'Blank master finalization requires trusted server authority.' using errcode='42501';
  end if;
  if not exists(
    select 1 from public.profiles
    where id=p_actor_profile_id and status='active'
      and primary_role in ('platform_administrator','youth_pastor','staff_member')
  ) then
    raise exception 'Document template management is denied.' using errcode='42501';
  end if;
  select * into selected from public.document_template_versions where id=p_version_id for update;
  if not found or selected.status<>'draft' or selected.blank_storage_bucket<>'form-template-masters'
    or selected.blank_storage_object_path is null or selected.content_type is not null
    or p_content_type<>'application/pdf' or p_file_size_bytes not between 1 and 15728640
    or p_original_file_name is distinct from btrim(p_original_file_name)
    or length(p_original_file_name) not between 5 and 120
    or p_original_file_name !~ '^[[:alnum:] _().-]+\.pdf$'
    or p_original_file_name ~ '[[:cntrl:]/\\]'
    or p_checksum_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Blank master file details are invalid.' using errcode='22023';
  end if;
  select metadata into stored from storage.objects where bucket_id='form-template-masters' and name=selected.blank_storage_object_path;
  if not found or coalesce(stored.metadata->>'mimetype','')<>'application/pdf'
    or coalesce((stored.metadata->>'size')::bigint,0)<>p_file_size_bytes then
    raise exception 'Uploaded blank master could not be verified.' using errcode='22023';
  end if;
  update public.document_template_versions set original_file_name=btrim(p_original_file_name),content_type=p_content_type,
    file_size_bytes=p_file_size_bytes,checksum_sha256=p_checksum_sha256 where id=p_version_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(p_actor_profile_id,'forms.template_master_finalized','document_template_version',p_version_id,'success','web',
    jsonb_build_object('templateId',selected.template_id,'mimeCategory','pdf','byteCount',p_file_size_bytes));
end $$;

create or replace function public.authorize_document_template_master_finalization(p_version_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=off as $$ declare selected record; begin
  perform private.require_document_template_manager();
  select template_id,status,blank_storage_bucket,blank_storage_object_path,content_type,file_size_bytes
  into selected from public.document_template_versions where id=p_version_id;
  if not found or selected.status<>'draft' or selected.blank_storage_bucket<>'form-template-masters'
    or selected.blank_storage_object_path is null or selected.content_type is not null
    or selected.file_size_bytes is not null then
    raise exception 'Draft version is unavailable for master finalization.' using errcode='22023';
  end if;
  return jsonb_build_object('bucket',selected.blank_storage_bucket,'objectPath',selected.blank_storage_object_path,
    'actorProfileId',auth.uid());
end $$;

create or replace function public.publish_document_template_version(p_version_id uuid)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ declare selected record; begin
  perform private.require_document_template_manager();
  select * into selected from public.document_template_versions where id=p_version_id for update;
  if not found or selected.status<>'draft' or selected.content_type<>'application/pdf' or selected.file_size_bytes is null
    or not exists(select 1 from storage.objects where bucket_id=selected.blank_storage_bucket and name=selected.blank_storage_object_path) then
    raise exception 'A verified blank master is required before publication.' using errcode='22023';
  end if;
  update public.document_template_versions set status='published',published_at=now(),published_by_profile_id=auth.uid() where id=p_version_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'forms.template_version_published','document_template_version',p_version_id,'success','web',
    jsonb_build_object('templateId',selected.template_id,'versionNumber',selected.version_number));
end $$;

create or replace function public.retire_document_template_version(p_version_id uuid)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ declare selected record; begin
  perform private.require_document_template_manager();
  select * into selected from public.document_template_versions where id=p_version_id for update;
  if not found or selected.status<>'published' then raise exception 'Published version not found.' using errcode='P0002'; end if;
  update public.document_template_versions set status='retired' where id=p_version_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'forms.template_version_retired','document_template_version',p_version_id,'success','web',
    jsonb_build_object('templateId',selected.template_id,'versionNumber',selected.version_number));
end $$;

create or replace function public.archive_document_template(p_template_id uuid)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ begin
  perform private.require_document_template_manager();
  update public.document_templates set status='archived',archived_at=now(),archived_by_profile_id=auth.uid()
  where id=p_template_id and status<>'archived';
  if not found then raise exception 'Active template not found.' using errcode='P0002'; end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'forms.template_archived','document_template',p_template_id,'success','web','{}');
end $$;

create or replace function public.list_document_templates()
returns table(template_id uuid,name text,description text,document_kind public.document_kind,status public.document_template_status,
  version_count bigint,latest_version_number integer) language plpgsql stable security definer set search_path='' set row_security=off as $$ begin
  perform private.require_document_template_manager();
  return query select t.id,t.name,t.description,t.document_kind,t.status,count(v.id),max(v.version_number)
  from public.document_templates t left join public.document_template_versions v on v.template_id=t.id
  group by t.id order by t.name;
end $$;

create or replace function public.list_document_template_versions(p_template_id uuid)
returns table(version_id uuid,version_number integer,status public.document_template_version_status,
  validity_policy public.document_validity_policy,valid_for interval,explicit_expires_on date,
  effective_from date,effective_to date,has_master boolean,
  original_file_name text,file_size_bytes bigint,published_at timestamptz)
language plpgsql stable security definer set search_path='' set row_security=off as $$ begin
  perform private.require_document_template_manager();
  return query select v.id,v.version_number,v.status,v.validity_policy,v.valid_for,v.explicit_expires_on,v.effective_from,v.effective_to,
    v.content_type='application/pdf' and v.file_size_bytes is not null,v.original_file_name,v.file_size_bytes,v.published_at
  from public.document_template_versions v where v.template_id=p_template_id order by v.version_number desc;
end $$;

create or replace function public.authorize_document_template_master_download(p_version_id uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=off as $$ declare selected record; begin
  perform private.require_document_template_manager();
  select template_id,version_number,status,blank_storage_bucket,blank_storage_object_path,original_file_name
  into selected from public.document_template_versions where id=p_version_id
    and content_type='application/pdf' and file_size_bytes is not null;
  if not found then raise exception 'Blank master download is denied.' using errcode='42501'; end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'forms.template_master_download_authorized','document_template_version',p_version_id,'success','web',
    jsonb_build_object('templateId',selected.template_id,'versionNumber',selected.version_number,'status',selected.status));
  return jsonb_build_object('bucket',selected.blank_storage_bucket,'objectPath',selected.blank_storage_object_path,
    'fileName',selected.original_file_name);
end $$;

revoke all on function private.require_document_template_manager() from public,anon,authenticated;
grant execute on function private.require_document_template_manager() to authenticated;
revoke all on function public.create_document_template(text,text,public.document_kind),
 public.create_document_template_version(uuid,public.document_validity_policy,interval,date,date,date),
 public.update_document_template_version_draft(uuid,public.document_validity_policy,interval,date,date,date),
 public.prepare_document_template_master_upload(uuid,uuid),
 public.authorize_document_template_master_finalization(uuid),
 public.finalize_document_template_master_upload(uuid,uuid,text,text,bigint,text),
 public.publish_document_template_version(uuid),public.retire_document_template_version(uuid),
 public.archive_document_template(uuid),public.list_document_templates(),
 public.list_document_template_versions(uuid),public.authorize_document_template_master_download(uuid)
 from public,anon,authenticated;
grant execute on function public.create_document_template(text,text,public.document_kind),
 public.create_document_template_version(uuid,public.document_validity_policy,interval,date,date,date),
 public.update_document_template_version_draft(uuid,public.document_validity_policy,interval,date,date,date),
 public.prepare_document_template_master_upload(uuid,uuid),
 public.authorize_document_template_master_finalization(uuid),
 public.publish_document_template_version(uuid),public.retire_document_template_version(uuid),
 public.archive_document_template(uuid),public.list_document_templates(),
 public.list_document_template_versions(uuid),public.authorize_document_template_master_download(uuid)
 to authenticated;
grant execute on function public.finalize_document_template_master_upload(uuid,uuid,text,text,bigint,text)
 to service_role;

commit;
