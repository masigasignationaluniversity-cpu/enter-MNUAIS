create table if not exists public.portal_auth_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null,
  email text not null,
  role text not null default 'student',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_auth_profiles_username_key unique (username),
  constraint portal_auth_profiles_email_key unique (email),
  constraint portal_auth_profiles_role_check check (role in ('admin', 'ocs', 'faculty', 'student', 'department_head')),
  constraint portal_auth_profiles_status_check check (status in ('active', 'inactive'))
);

create unique index if not exists portal_auth_profiles_username_lower_key
  on public.portal_auth_profiles (lower(username));

alter table public.portal_auth_profiles enable row level security;
revoke all on table public.portal_auth_profiles from public, anon, authenticated;
grant select on table public.portal_auth_profiles to authenticated;

drop policy if exists portal_auth_profiles_select_own on public.portal_auth_profiles;
create policy portal_auth_profiles_select_own
  on public.portal_auth_profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.handle_new_portal_auth_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_username text;
  normalized_name text;
begin
  normalized_username := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'username', ''))), '');
  if normalized_username is null then
    normalized_username := pg_catalog.lower(pg_catalog.split_part(coalesce(new.email, ''), '@', 1));
  end if;
  normalized_name := nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');

  insert into public.portal_auth_profiles (user_id, username, display_name, email, role, status)
  values (
    new.id,
    normalized_username,
    coalesce(normalized_name, normalized_username),
    pg_catalog.lower(new.email),
    'student',
    'active'
  )
  on conflict (user_id) do update
    set username = excluded.username,
        display_name = excluded.display_name,
        email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_portal_auth_user_created on auth.users;
create trigger on_portal_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_portal_auth_profile();
