-- Fix RLS for households table
-- Ensure policies exist for viewing households
-- Enable RLS (just in case)
alter table public.households enable row level security;
-- Drop existing policy if it exists to avoid conflicts (optional, but good practice)
drop policy if exists "Household members can view their household" on public.households;
-- Create the policy
create policy "Household members can view their household" on public.households for
select using (
        exists (
            select 1
            from public.household_members
            where household_members.household_id = households.id
                and household_members.user_id = auth.uid()
        )
    );
-- Also allow creating households (if not already covered)
drop policy if exists "Users can create households" on public.households;
create policy "Users can create households" on public.households for
insert with check (auth.uid() = admin_user_id);