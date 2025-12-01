-- RESET DATABASE SCRIPT
-- WARNING: This will delete ALL data in your app (Households, Members, Chats, Chores, etc.)
-- It will NOT delete the user accounts from Supabase Authentication (you need to do that in the Supabase Dashboard > Authentication).
-- Truncate households and cascade to all dependent tables (members, chats, chores, etc.)
TRUNCATE TABLE public.households CASCADE;
-- If you also want to remove the user profiles from the public.users table:
-- TRUNCATE TABLE public.users CASCADE;