-- À exécuter dans Supabase SQL Editor après paiements.sql et notes_seance.sql.

ALTER TABLE public.paiements
  ADD COLUMN IF NOT EXISTS note_seance_id text;

CREATE INDEX IF NOT EXISTS idx_paiements_note_seance_id
  ON public.paiements (note_seance_id);

CREATE OR REPLACE FUNCTION public.validate_paiement_seance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.note_seance_id IS NULL OR btrim(NEW.note_seance_id) = '' THEN
    RAISE EXCEPTION 'Un paiement doit être associé à une séance.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.notes_seance AS seance
    WHERE seance.id::text = NEW.note_seance_id
      AND seance.patient_id = NEW.patient_id
      AND seance.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'La séance sélectionnée ne correspond pas à ce patient.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS paiements_require_seance ON public.paiements;

CREATE TRIGGER paiements_require_seance
  BEFORE INSERT OR UPDATE OF note_seance_id, patient_id, user_id
  ON public.paiements
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_paiement_seance();

CREATE OR REPLACE FUNCTION public.prevent_delete_paid_seance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.paiements AS paiement
    WHERE paiement.note_seance_id = OLD.id::text
      AND paiement.patient_id = OLD.patient_id
  ) THEN
    RAISE EXCEPTION 'Supprimez d’abord les paiements associés à cette séance.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS notes_seance_prevent_paid_delete ON public.notes_seance;

CREATE TRIGGER notes_seance_prevent_paid_delete
  BEFORE DELETE
  ON public.notes_seance
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_delete_paid_seance();
