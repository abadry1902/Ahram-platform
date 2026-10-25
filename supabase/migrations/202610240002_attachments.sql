-- Private operational attachments. Do not upload client case files in phase one.
create table if not exists public.task_attachments (
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.tasks(id) on delete cascade,
 uploader_id uuid not null references public.profiles(id),
 filename text not null check (char_length(filename) between 1 and 180),
 storage_path text not null unique,
 mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png')),
 byte_size int not null check (byte_size between 1 and 5242880),
 created_at timestamptz not null default now()
);
alter table public.task_attachments enable row level security;
create policy "participants see operational attachments" on public.task_attachments
 for select to authenticated using (public.is_supervisor() or public.is_task_member(task_id));
create policy "participants register operational attachment" on public.task_attachments
 for insert to authenticated with check (uploader_id=auth.uid() and (public.is_supervisor() or public.is_task_member(task_id)));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('task-ops','task-ops',false,5242880,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do nothing;

create or replace function public.get_attachment_task_id(file_path text) returns uuid
language plpgsql stable security invoker set search_path='' as $$
declare result uuid;
begin
 result:=split_part(file_path,'/',1)::uuid;
 return result;
exception when invalid_text_representation then
 return null;
end; $$;

create policy "only participants can read task storage objects" on storage.objects for select to authenticated
 using (bucket_id='task-ops' and (public.is_supervisor() or public.is_task_member(public.get_attachment_task_id(name))));
create policy "only participants can upload operational files" on storage.objects for insert to authenticated
 with check (
   bucket_id='task-ops' and
   (public.is_supervisor() or public.is_task_member(public.get_attachment_task_id(name))) and
   split_part(name,'/',2)=auth.uid()::text and
   lower(storage.extension(name)) in ('pdf','jpg','jpeg','png')
 );
-- Malware scanning / content inspection must be integrated and verified before permitting operational uploads in production.

revoke all on function public.get_attachment_task_id(text) from public,anon,authenticated;
grant execute on function public.get_attachment_task_id(text) to authenticated;
