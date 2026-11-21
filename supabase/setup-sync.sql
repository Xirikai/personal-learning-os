-- Run in a NEW Supabase project. Never use a shared author's project.
create table if not exists public.user_data (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check (
  payload->>'format' is not distinct from 'personal-learning-os-backup' and
  payload->>'version' is not distinct from '1' and jsonb_typeof(payload->'data') is not distinct from 'object' and
  octet_length(payload::text) <= 10000000
 ),
 updated_at timestamptz not null default clock_timestamp()
);
alter table public.user_data enable row level security;
revoke all on table public.user_data from anon;
grant select,insert,update on table public.user_data to authenticated;
drop policy if exists plos_select_own on public.user_data;
create policy plos_select_own on public.user_data for select to authenticated
 using ((select auth.uid()) = user_id);
drop policy if exists plos_insert_own on public.user_data;
create policy plos_insert_own on public.user_data for insert to authenticated
 with check ((select auth.uid()) = user_id);
drop policy if exists plos_update_own on public.user_data;
create policy plos_update_own on public.user_data for update to authenticated
 using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Existing backups and RLS policies are preserved.
create or replace function public.plos_save_data(p_payload jsonb, p_expected timestamptz default null)
returns table(payload jsonb, updated_at timestamptz)
language plpgsql security invoker set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_payload->>'format' is distinct from 'personal-learning-os-backup'
     or p_payload->>'version' is distinct from '1'
     or jsonb_typeof(p_payload->'data') is distinct from 'object'
     or octet_length(p_payload::text) > 10000000 then
    raise exception 'Invalid backup' using errcode = '22023';
  end if;
  if p_expected is null then
    return query insert into public.user_data as target(user_id,payload,updated_at)
      values(auth.uid(),p_payload,clock_timestamp())
      on conflict(user_id) do nothing returning target.payload,target.updated_at;
  else
    return query update public.user_data as target
      set payload=p_payload,updated_at=greatest(clock_timestamp(),target.updated_at+interval '1 microsecond')
      where target.user_id=auth.uid() and target.updated_at=p_expected
      returning target.payload,target.updated_at;
  end if;
end;
$$;
revoke all on function public.plos_save_data(jsonb,timestamptz) from public,anon;
grant execute on function public.plos_save_data(jsonb,timestamptz) to authenticated;
