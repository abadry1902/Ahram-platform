begin;
-- Explicit API privileges: RLS does not protect TRUNCATE or trigger creation.
revoke all on public.service_media,public.push_subscriptions,public.team_account_events from public,anon,authenticated;
grant select on public.service_media to anon;
grant select,insert,update,delete on public.service_media,public.push_subscriptions to authenticated;
grant select on public.team_account_events to authenticated;
commit;
