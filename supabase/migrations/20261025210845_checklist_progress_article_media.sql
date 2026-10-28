-- Checklist progress is derived in PostgreSQL, including direct API writes.
create or replace function public.derive_assignment_progress() returns trigger
language plpgsql security definer set search_path='' as $$
declare total int; completed int;
begin
 perform 1 from public.tasks where id=new.task_id for update;
 select count(*) into total from public.task_steps where task_id=new.task_id;
 if total>0 then
  select count(*) into completed from public.step_completions c join public.task_steps s on s.id=c.step_id where s.task_id=new.task_id and c.user_id=new.user_id;
  new.progress=round(100.0*completed/total);
 end if;
 return new;
end; $$;
create trigger assignment_derived_progress before insert or update on public.task_assignments for each row execute function public.derive_assignment_progress();
create or replace function public.derive_task_progress() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 select coalesce(round(avg(progress)),0) into new.progress from public.task_assignments where task_id=new.id;
 return new;
end; $$;
create trigger task_derived_progress before update of progress on public.tasks for each row execute function public.derive_task_progress();
create or replace function public.refresh_checklist_progress() returns trigger
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if tg_table_name='step_completions' then
  select task_id into target from public.task_steps where id=coalesce(new.step_id,old.step_id);
 else target=coalesce(new.task_id,old.task_id); end if;
 perform 1 from public.tasks where id=target for update;
 if exists(select 1 from public.tasks where id=target and status in ('done','expired')) then return null; end if;
 if tg_table_name<>'task_assignments' then
  update public.task_assignments set updated_at=now() where task_id=target;
 else
  update public.tasks set progress=(select coalesce(round(avg(progress)),0) from public.task_assignments where task_id=target),updated_at=now() where id=target;
 end if;
 return null;
end; $$;
create trigger checklist_progress after insert or delete on public.step_completions for each row execute function public.refresh_checklist_progress();
create trigger steps_progress after insert or delete on public.task_steps for each row execute function public.refresh_checklist_progress();
create trigger members_progress after insert or update or delete on public.task_assignments for each row execute function public.refresh_checklist_progress();
revoke all on function public.derive_assignment_progress(),public.derive_task_progress(),public.refresh_checklist_progress() from public,anon,authenticated;

alter table public.articles add column categories text[] not null default '{}', add column image_url text;
update public.articles set categories=array[category] where status<>'published';
-- Published rows retain the legacy primary category until their next approved edit.
alter table public.articles add constraint article_categories_limit check(cardinality(categories)<=20);
alter table public.articles add constraint article_image_https check(image_url is null or (image_url like 'https://%' and length(image_url)<=2048));

-- Public editorial covers only; operational task attachments remain disabled.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('article-images','article-images',true,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "editors upload public article covers" on storage.objects for insert to authenticated
with check(bucket_id='article-images' and public.is_content_editor() and split_part(name,'/',1)=(select auth.uid())::text and storage.extension(name) in ('jpg','jpeg','png','webp'));

update public.task_assignments a set updated_at=now()
where exists(select 1 from public.tasks t where t.id=a.task_id and t.status not in ('done','expired'));
