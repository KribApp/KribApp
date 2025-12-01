-- EMERGENCY REVERT SCRIPT
-- This script disables Row Level Security on the affected tables to restore access.
-- 1. Disable RLS on households and household_members
ALTER TABLE public.households DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members DISABLE ROW LEVEL SECURITY;
-- 2. Drop the problematic policies (just to clean up)
DROP POLICY IF EXISTS "Members can view household members" ON public.household_members;
DROP POLICY IF EXISTS "Admins can update household members" ON public.household_members;
DROP POLICY IF EXISTS "Admins can delete household members" ON public.household_members;
DROP POLICY IF EXISTS "Users can join households" ON public.household_members;
DROP POLICY IF EXISTS "Members can view their households" ON public.households;
DROP POLICY IF EXISTS "Authenticated users can create households" ON public.households;
DROP POLICY IF EXISTS "Admins can update their households" ON public.households;
-- 3. Drop the helper function
DROP FUNCTION IF EXISTS public.is_household_member(_household_id uuid);