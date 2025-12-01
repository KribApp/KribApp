-- Add timezone and country columns to households table
ALTER TABLE public.households
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/Amsterdam',
    ADD COLUMN IF NOT EXISTS country text;
-- Update existing records to have a default timezone if null (though default handles new ones)
UPDATE public.households
SET timezone = 'Europe/Amsterdam'
WHERE timezone IS NULL;