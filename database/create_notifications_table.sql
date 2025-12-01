-- Create Notifications table
create table if not exists public.notifications (
    id uuid default uuid_generate_v4() primary key,
    household_id uuid references public.households(id) on delete cascade not null,
    type text not null,
    -- e.g., 'SHOPPING_ITEM_OUT_OF_STOCK'
    title text not null,
    message text not null,
    related_entity_id uuid,
    -- Optional link to other tables (e.g., shopping_items)
    is_resolved boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Enable RLS
alter table public.notifications enable row level security;
-- Policies
create policy "Household members can view notifications" on public.notifications for
select using (
        exists (
            select 1
            from public.household_members
            where household_members.household_id = notifications.household_id
                and household_members.user_id = auth.uid()
        )
    );
create policy "Household members can insert notifications" on public.notifications for
insert with check (
        exists (
            select 1
            from public.household_members
            where household_members.household_id = notifications.household_id
                and household_members.user_id = auth.uid()
        )
    );
create policy "Household members can update notifications" on public.notifications for
update using (
        exists (
            select 1
            from public.household_members
            where household_members.household_id = notifications.household_id
                and household_members.user_id = auth.uid()
        )
    );