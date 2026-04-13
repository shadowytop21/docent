create extension if not exists pgcrypto;

do $$
begin
  create type public.user_role as enum ('teacher', 'parent');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.teacher_status as enum ('pending', 'verified', 'rejected');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.teaching_mode as enum ('student_home', 'teacher_home', 'both');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  photo_url text,
  bio text check (char_length(bio) <= 200),
  subjects text[] not null default '{}'::text[] check (coalesce(array_length(subjects, 1), 0) <= 6),
  grades text[] not null default '{}'::text[] check (coalesce(array_length(grades, 1), 0) <= 4),
  boards text[] not null default '{}'::text[],
  locality text not null,
  price_per_month integer not null check (price_per_month between 500 and 10000),
  teaches_at public.teaching_mode not null,
  availability text[] not null default '{}'::text[],
  experience_years integer not null default 0,
  whatsapp_number text not null,
  status public.teacher_status not null default 'pending',
  is_founding_member boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  parent_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now(),
  unique (teacher_id, parent_id)
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_email text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_phone_unique_idx on public.profiles (phone) where phone is not null;
create unique index if not exists reviews_parent_daily_unique_idx on public.reviews (parent_id, (date(created_at)));

create index if not exists teacher_profiles_status_idx on public.teacher_profiles (status);
create index if not exists teacher_profiles_locality_idx on public.teacher_profiles (locality);
create index if not exists reviews_teacher_idx on public.reviews (teacher_id);
create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_action_idx on public.admin_audit_logs (action);

alter table public.profiles enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.reviews enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "admin audit logs read denied" on public.admin_audit_logs;
create policy "admin audit logs read denied"
on public.admin_audit_logs
for select
using (false);

drop policy if exists "admin audit logs write denied" on public.admin_audit_logs;
create policy "admin audit logs write denied"
on public.admin_audit_logs
for insert
with check (false);

create policy "profiles are readable by owner"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles are insertable by owner"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles are updatable by owner"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "verified teacher profiles are public"
on public.teacher_profiles
for select
using (status = 'verified' or auth.uid() = user_id);

create policy "teacher profiles are insertable by owner"
on public.teacher_profiles
for insert
with check (auth.uid() = user_id);

create policy "teacher profiles are updatable by owner"
on public.teacher_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "reviews are public"
on public.reviews
for select
using (true);

create policy "reviews are insertable by parent"
on public.reviews
for insert
with check (auth.uid() = parent_id);

create or replace function public.guard_review_submission()
returns trigger
language plpgsql
as $$
declare
  reviewer_is_teacher boolean;
  teacher_owner uuid;
begin
  select exists (
    select 1 from public.teacher_profiles tp where tp.user_id = new.parent_id
  ) into reviewer_is_teacher;

  if reviewer_is_teacher then
    raise exception 'Teachers cannot submit reviews';
  end if;

  select tp.user_id into teacher_owner
  from public.teacher_profiles tp
  where tp.id = new.teacher_id;

  if teacher_owner = new.parent_id then
    raise exception 'Teachers cannot submit reviews';
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_guard_submission_trigger on public.reviews;
create trigger reviews_guard_submission_trigger
before insert or update on public.reviews
for each row execute function public.guard_review_submission();

create or replace function public.assign_founding_member()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.teacher_profiles) < 50 then
    new.is_founding_member := true;
  end if;

  return new;
end;
$$;

drop trigger if exists teacher_profiles_founder_trigger on public.teacher_profiles;
create trigger teacher_profiles_founder_trigger
before insert on public.teacher_profiles
for each row execute function public.assign_founding_member();