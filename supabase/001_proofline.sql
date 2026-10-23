-- Run in YOUR Supabase project's SQL editor after reviewing.
-- Private workspaces; no anonymous access to real data.
begin;
create table if not exists public.proofline_workspaces (
 id uuid primary key,
 owner_id uuid not null references auth.users(id),
 state jsonb not null,
 revision bigint not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.proofline_members (
 workspace_id uuid not null references public.proofline_workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('creator','manager','reviewer')),
 display_name text not null,
 primary key(workspace_id,user_id)
);
alter table public.proofline_workspaces enable row level security;
alter table public.proofline_members enable row level security;
revoke all on public.proofline_workspaces, public.proofline_members from anon;
grant select on public.proofline_workspaces, public.proofline_members to authenticated;
grant all on public.proofline_workspaces, public.proofline_members to service_role;
drop policy if exists proofline_self_membership on public.proofline_members;
create policy proofline_self_membership on public.proofline_members for select to authenticated using(user_id=auth.uid());
drop policy if exists proofline_workspace_read on public.proofline_workspaces;
create policy proofline_workspace_read on public.proofline_workspaces for select to authenticated using(exists(select 1 from public.proofline_members m where m.workspace_id=id and m.user_id=auth.uid()));
-- No direct authenticated write policies. Server verifies identity and membership
-- on EVERY operation; privileged key must never leave the server.
create or replace function public.proofline_cas_state(p_id uuid,p_expected bigint,p_state jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 update public.proofline_workspaces set state=p_state,revision=revision+1,updated_at=now() where id=p_id and revision=p_expected;
 return found;
end;
$$;
revoke all on function public.proofline_cas_state(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.proofline_cas_state(uuid,bigint,jsonb) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('proofline-private','proofline-private',false,5242880,array['application/pdf','text/plain','image/png','image/jpeg'])
on conflict(id) do nothing;
drop policy if exists proofline_private_file_read on storage.objects;
create policy proofline_private_file_read on storage.objects for select to authenticated using(bucket_id='proofline-private' and exists(select 1 from public.proofline_members m where m.user_id=auth.uid() and m.workspace_id::text=(storage.foldername(name))[1]));
commit;
