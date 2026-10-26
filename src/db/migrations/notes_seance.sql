-- notes_seance.sql  (à exécuter dans Supabase SQL Editor)

ALTER TABLE public.notes_seance
  ADD COLUMN IF NOT EXISTS tarif numeric(10,2) NOT NULL DEFAULT 200;

ALTER TABLE public.notes_seance
  ADD COLUMN IF NOT EXISTS paye boolean NOT NULL DEFAULT false;

UPDATE public.notes_seance
SET paye = false
WHERE paye IS NULL;

-- Optionnel : garder la logique cohérente pour les écritures
-- (si votre table a déjà des policies ou si vous utilisez le même pattern que paiements/factures)

ALTER TABLE public.notes_seance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notes_seance'
      AND policyname = 'ortho voit ses notes de séance'
  ) THEN
    CREATE POLICY "ortho voit ses notes de séance"
      ON public.notes_seance
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
