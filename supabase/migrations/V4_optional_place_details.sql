ALTER TABLE public.places
  ALTER COLUMN estimated_duration_minutes DROP NOT NULL,
  ALTER COLUMN estimated_duration_minutes DROP DEFAULT,
  ADD COLUMN IF NOT EXISTS dress_code text,
  ADD COLUMN IF NOT EXISTS rules text[],
  ADD COLUMN IF NOT EXISTS activities text[];
