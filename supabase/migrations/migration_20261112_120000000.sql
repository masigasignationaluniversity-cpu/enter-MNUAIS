create extension if not exists pgcrypto with schema extensions;

create table public.admission_applications (
  id uuid primary key default gen_random_uuid(),
  application_no text not null unique default ('MNU-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  first_name text not null check (char_length(trim(first_name)) between 1 and 100),
  last_name text not null check (char_length(trim(last_name)) between 1 and 100),
  date_of_birth date not null,
  email text not null check (char_length(email) <= 254 and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text not null check (char_length(trim(phone)) between 7 and 30),
  program text not null check (char_length(trim(program)) between 1 and 160),
  intake_term text not null check (char_length(trim(intake_term)) between 1 and 80),
  previous_school text not null check (char_length(trim(previous_school)) between 1 and 180),
  personal_statement text not null check (char_length(trim(personal_statement)) between 50 and 3000),
  tracking_token_hash text not null check (tracking_token_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'accepted', 'waitlisted', 'rejected')),
  review_notes text check (review_notes is null or char_length(review_notes) <= 4000),
  reviewed_by uuid references auth.users(id) on delete set null,
  decision_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index admission_applications_created_at_idx on public.admission_applications (created_at desc);
create index admission_applications_status_idx on public.admission_applications (status, created_at desc);

create or replace function public.set_admission_application_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger admission_applications_updated_at
before update on public.admission_applications
for each row execute function public.set_admission_application_updated_at();

alter table public.admission_applications enable row level security;
revoke all on public.admission_applications from anon, authenticated;
grant select on public.admission_applications to authenticated;
grant update (status, review_notes, reviewed_by, decision_at) on public.admission_applications to authenticated;

create policy admission_staff_select_applications
on public.admission_applications for select to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'admissions_role', '') in ('admin', 'staff'));

create policy admission_staff_update_applications
on public.admission_applications for update to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'admissions_role', '') in ('admin', 'staff'))
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'admissions_role', '') in ('admin', 'staff')
  and (reviewed_by is null or reviewed_by = auth.uid())
);

create or replace function public.submit_admission_application(
  p_first_name text,
  p_last_name text,
  p_date_of_birth date,
  p_email text,
  p_phone text,
  p_program text,
  p_intake_term text,
  p_previous_school text,
  p_personal_statement text,
  p_tracking_token_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application_no text;
begin
  if p_first_name is null or char_length(trim(p_first_name)) not between 1 and 100
    or p_last_name is null or char_length(trim(p_last_name)) not between 1 and 100
    or p_date_of_birth is null
    or p_email is null or char_length(p_email) > 254 or p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_phone is null or char_length(trim(p_phone)) not between 7 and 30
    or p_program is null or char_length(trim(p_program)) not between 1 and 160
    or p_intake_term is null or char_length(trim(p_intake_term)) not between 1 and 80
    or p_previous_school is null or char_length(trim(p_previous_school)) not between 1 and 180
    or p_personal_statement is null or char_length(trim(p_personal_statement)) not between 50 and 3000
    or p_tracking_token_hash is null or p_tracking_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Application details are invalid.';
  end if;

  insert into public.admission_applications (
    first_name, last_name, date_of_birth, email, phone, program, intake_term,
    previous_school, personal_statement, tracking_token_hash
  ) values (
    trim(p_first_name), trim(p_last_name), p_date_of_birth, lower(trim(p_email)), trim(p_phone),
    trim(p_program), trim(p_intake_term), trim(p_previous_school), trim(p_personal_statement),
    p_tracking_token_hash
  ) returning application_no into v_application_no;

  return v_application_no;
end;
$$;

revoke all on function public.submit_admission_application(text, text, date, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_admission_application(text, text, date, text, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.lookup_admission_status(p_application_no text, p_tracking_token text)
returns table (application_no text, status text, program text, created_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select a.application_no, a.status, a.program, a.created_at
  from public.admission_applications as a
  where a.application_no = upper(trim(p_application_no))
    and a.tracking_token_hash = encode(extensions.digest(convert_to(p_tracking_token, 'UTF8'), 'sha256'), 'hex')
  limit 1;
$$;

revoke all on function public.lookup_admission_status(text, text) from public;
grant execute on function public.lookup_admission_status(text, text) to anon, authenticated;
