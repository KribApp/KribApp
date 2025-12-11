-- Enable RLS on turf_counters just in case
alter table public.turf_counters enable row level security;

-- Drop existing policies to avoid conflicts/duplicates
drop policy if exists "Household members can select turf counters" on public.turf_counters;
drop policy if exists "Household members can insert turf counters" on public.turf_counters;
drop policy if exists "Household members can update turf counters" on public.turf_counters;
drop policy if exists "Household members can delete turf counters" on public.turf_counters;
drop policy if exists "Users can see their own turf counters" on public.turf_counters; -- Fallback from copy/paste if exists
drop policy if exists "Enable read access for all users" on public.turf_counters;

-- Create comprehensive policies

-- 1. SELECT: Household members can view all counters in their household
create policy "Household members can select turf counters"
on public.turf_counters for select
to authenticated
using (
  exists (
    select 1 from public.household_members
    where household_members.household_id = turf_counters.household_id
    and household_members.user_id = (select auth.uid())
  )
);

-- 2. INSERT: Household members can create counters (lists) in their household
create policy "Household members can insert turf counters"
on public.turf_counters for insert
to authenticated
with check (
  exists (
    select 1 from public.household_members
    where household_members.household_id = turf_counters.household_id
    and household_members.user_id = (select auth.uid())
  )
);

-- 3. UPDATE: Household members can update counters in their household
create policy "Household members can update turf counters"
on public.turf_counters for update
to authenticated
using (
  exists (
    select 1 from public.household_members
    where household_members.household_id = turf_counters.household_id
    and household_members.user_id = (select auth.uid())
  )
);

-- 4. DELETE: Household members can delete counters in their household
create policy "Household members can delete turf counters"
on public.turf_counters for delete
to authenticated
using (
  exists (
    select 1 from public.household_members
    where household_members.household_id = turf_counters.household_id
    and household_members.user_id = (select auth.uid())
  )
);
