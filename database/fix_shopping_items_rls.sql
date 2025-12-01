-- Fix Shopping Items RLS
alter table public.shopping_items enable row level security;
-- Drop existing policies to avoid conflicts
drop policy if exists "Household members can view shopping items" on public.shopping_items;
drop policy if exists "Household members can insert shopping items" on public.shopping_items;
drop policy if exists "Household members can update shopping items" on public.shopping_items;
drop policy if exists "Household members can delete shopping items" on public.shopping_items;
-- Re-create policies
create policy "Household members can view shopping items" on public.shopping_items for
select using (
        exists (
            select 1
            from public.household_members
            where household_members.household_id = shopping_items.household_id
                and household_members.user_id = auth.uid()
        )
    );
create policy "Household members can insert shopping items" on public.shopping_items for
insert with check (
        exists (
            select 1
            from public.household_members
            where household_members.household_id = shopping_items.household_id
                and household_members.user_id = auth.uid()
        )
    );
create policy "Household members can update shopping items" on public.shopping_items for
update using (
        exists (
            select 1
            from public.household_members
            where household_members.household_id = shopping_items.household_id
                and household_members.user_id = auth.uid()
        )
    );
create policy "Household members can delete shopping items" on public.shopping_items for delete using (
    exists (
        select 1
        from public.household_members
        where household_members.household_id = shopping_items.household_id
            and household_members.user_id = auth.uid()
    )
);