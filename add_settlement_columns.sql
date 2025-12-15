-- Add settlement columns to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS is_settled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_expenses_settled ON public.expenses(household_id, is_settled);
