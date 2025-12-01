-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users conceptually, but we keep our own profile data)
create table public.users (
  id uuid references auth.users not null primary key, -- Link to Supabase Auth
  username text unique,
  email text,
  profile_picture_url text,
  birthdate date,
  phone_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Households table
create table public.households (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  admin_user_id uuid references public.users(id) not null,
  invite_code text unique not null,
  config_deadline_time time default '16:00:00',
  config_no_response_action text check (config_no_response_action in ('EAT', 'NO_EAT')) default 'NO_EAT',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Household Members table
create table public.household_members (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role text check (role in ('ADMIN', 'MEMBER')) default 'MEMBER',
  karma_points integer default 0,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(household_id, user_id)
);

-- Chat Messages table
create table public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete set null, -- Nullable for system messages
  content text not null,
  message_type text check (message_type in ('TEXT', 'SYSTEM_ALERT')) default 'TEXT',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Shopping Items table
create table public.shopping_items (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  name text not null,
  is_checked boolean default false,
  added_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Hall of Fame (Recipes) table
create table public.hall_of_fame (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  recipe_name text not null,
  link_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Dining Attendance table
create table public.dining_attendance (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  status text check (status in ('EATING', 'NOT_EATING', 'PENDING')) default 'PENDING',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(household_id, user_id, date)
);

-- Chores table
create table public.chores (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  title text not null,
  assigned_to_user_id uuid references public.users(id) on delete set null,
  due_date timestamp with time zone,
  status text check (status in ('PENDING', 'COMPLETED', 'OVERDUE')) default 'PENDING',
  points integer default 10,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Expenses table
create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  payer_user_id uuid references public.users(id) on delete set null,
  amount numeric(10, 2) not null,
  description text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Expense Shares table (Who owes what)
create table public.expense_shares (
  id uuid default uuid_generate_v4() primary key,
  expense_id uuid references public.expenses(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  owed_amount numeric(10, 2) not null
);

-- Household Info table (Wiki)
create table public.household_info (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  title text not null,
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turf Counters table
create table public.turf_counters (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  item_name text not null,
  count integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(household_id, user_id, item_name)
);

-- Row Level Security (RLS) Policies (Examples - to be refined)
alter table public.users enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
-- ... enable for all tables

-- Basic policy: Users can see their own profile
-- Basic policy: Users can see their own profile
create policy "Users can view their own profile" on public.users
  for select using (true); -- Allow everyone to read profiles (needed for chat names)

-- Update users policy to be more specific if needed, e.g.:
-- create policy "Users can view profiles" on public.users
--   for select using (auth.role() = 'authenticated');

-- Chat Messages Policies
alter table public.chat_messages enable row level security;

create policy "Household members can view messages" on public.chat_messages
  for select using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = chat_messages.household_id
      and household_members.user_id = auth.uid()
    )
  );

create policy "Household members can insert messages" on public.chat_messages
  for insert with check (
    exists (
      select 1 from public.household_members
      where household_members.household_id = chat_messages.household_id
      and household_members.user_id = auth.uid()
    )
  );

-- Dining Attendance Policies
alter table public.dining_attendance enable row level security;

create policy "Household members can view attendance" on public.dining_attendance
  for select using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = dining_attendance.household_id
      and household_members.user_id = auth.uid()
    )
  );

create policy "Household members can insert attendance" on public.dining_attendance
  for insert with check (
    exists (
      select 1 from public.household_members
      where household_members.household_id = dining_attendance.household_id
      and household_members.user_id = auth.uid()
    )
  );

create policy "Household members can update attendance" on public.dining_attendance
  for update using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = dining_attendance.household_id
      and household_members.user_id = auth.uid()
    )
  );

-- Expense Lists table
create table public.expense_lists (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Update Expenses table to link to lists
alter table public.expenses add column list_id uuid references public.expense_lists(id) on delete cascade;

-- RLS for Expense Lists
alter table public.expense_lists enable row level security;

create policy "Household members can view expense lists" on public.expense_lists
  for select using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = expense_lists.household_id
      and household_members.user_id = auth.uid()
    )
  );

    exists (
      select 1 from public.household_members
      where household_members.household_id = expense_lists.household_id
      and household_members.user_id = auth.uid()
    )
  );

-- Chores Policies
alter table public.chores enable row level security;

create policy "Household members can view chores" on public.chores
  for select using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = chores.household_id
      and household_members.user_id = auth.uid()
    )
  );

create policy "Household members can insert chores" on public.chores
  for insert with check (
    exists (
      select 1 from public.household_members
      where household_members.household_id = chores.household_id
      and household_members.user_id = auth.uid()
    )
  );

create policy "Household members can update chores" on public.chores
  for update using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = chores.household_id
      and household_members.user_id = auth.uid()
    )
  );

-- Shopping Items Policies
alter table public.shopping_items enable row level security;

create policy "Household members can view shopping items" on public.shopping_items
  for select using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = shopping_items.household_id
      and household_members.user_id = auth.uid()
    )
  );

create policy "Household members can insert shopping items" on public.shopping_items
  for insert with check (
    exists (
      select 1 from public.household_members
      where household_members.household_id = shopping_items.household_id
      and household_members.user_id = auth.uid()
    )
  );

create policy "Household members can update shopping items" on public.shopping_items
  for update using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = shopping_items.household_id
      and household_members.user_id = auth.uid()
    )
  );

create policy "Household members can delete shopping items" on public.shopping_items
  for delete using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = shopping_items.household_id
      and household_members.user_id = auth.uid()
    )
  );

-- Expenses Policies
alter table public.expenses enable row level security;

create policy "Household members can view expenses" on public.expenses
  for select using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = expenses.household_id
      and household_members.user_id = auth.uid()
    )
  );

create policy "Household members can insert expenses" on public.expenses
  for insert with check (
    exists (
      select 1 from public.household_members
      where household_members.household_id = expenses.household_id
      and household_members.user_id = auth.uid()
    )
  );

-- Expense Shares Policies
alter table public.expense_shares enable row level security;

create policy "Users can view their own expense shares" on public.expense_shares
  for select using (
    user_id = auth.uid() 
    or exists (
      select 1 from public.expenses
      where expenses.id = expense_shares.expense_id
      and exists (
        select 1 from public.household_members
        where household_members.household_id = expenses.household_id
        and household_members.user_id = auth.uid()
      )
    )
  );

create policy "Household members can insert expense shares" on public.expense_shares
  for insert with check (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_shares.expense_id
      and exists (
        select 1 from public.household_members
        where household_members.household_id = expenses.household_id
        and household_members.user_id = auth.uid()
      )
    )
  );

-- Hall of Fame Policies
alter table public.hall_of_fame enable row level security;

create policy "Household members can view hall of fame" on public.hall_of_fame
  for select using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = hall_of_fame.household_id
      and household_members.user_id = auth.uid()
    )
  );

create policy "Household members can insert hall of fame" on public.hall_of_fame
  for insert with check (
    exists (
      select 1 from public.household_members
      where household_members.household_id = hall_of_fame.household_id
      and household_members.user_id = auth.uid()
    )
  );

-- Household Info Policies
alter table public.household_info enable row level security;

create policy "Household members can view household info" on public.household_info
  for select using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = household_info.household_id
      and household_members.user_id = auth.uid()
    )
  );

create policy "Household members can insert household info" on public.household_info
  for insert with check (
    exists (
      select 1 from public.household_members
      where household_members.household_id = household_info.household_id
      and household_members.user_id = auth.uid()
    )
  );

create policy "Household members can update household info" on public.household_info
  for update using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = household_info.household_id
      and household_members.user_id = auth.uid()
    )
  );

-- Turf Counters Policies
alter table public.turf_counters enable row level security;

create policy "Household members can view turf counters" on public.turf_counters
  for select using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = turf_counters.household_id
      and household_members.user_id = auth.uid()
    )
  );

create policy "Household members can insert turf counters" on public.turf_counters
  for insert with check (
    exists (
      select 1 from public.household_members
      where household_members.household_id = turf_counters.household_id
      and household_members.user_id = auth.uid()
    )
  );

create policy "Household members can update turf counters" on public.turf_counters
  for update using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = turf_counters.household_id
      and household_members.user_id = auth.uid()
    )
  );
