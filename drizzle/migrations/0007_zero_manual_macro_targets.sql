-- Optional migration for Macro Mint manual goal edits.
-- IMPORTANT: GitHub merge does NOT apply Lovable Cloud SQL migrations.
-- Apply this AFTER reviewing the existing nutritional_goals constraints in the
-- managed Lovable Cloud database; it does not touch auth, RLS or existing rows.
--
-- Distinguish manually entered individual target values (0 is representable)
-- from scientifically recommended intake: the app's goal recommender still
-- computes nonzero macro estimates where supported.
--
-- Drop only the existing check constraints referencing protein_g and fat_g.
-- Verify the existing names against pg_constraint first:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid = 'public.nutritional_goals'::regclass AND contype='c';
ALTER TABLE public.nutritional_goals
  DROP CONSTRAINT IF EXISTS nutritional_goals_protein_g_check;
ALTER TABLE public.nutritional_goals
  DROP CONSTRAINT IF EXISTS nutritional_goals_fat_g_check;
ALTER TABLE public.nutritional_goals
  ADD CONSTRAINT nutritional_goals_protein_g_check CHECK (protein_g BETWEEN 0 AND 500),
  ADD CONSTRAINT nutritional_goals_fat_g_check CHECK (fat_g BETWEEN 0 AND 400);
