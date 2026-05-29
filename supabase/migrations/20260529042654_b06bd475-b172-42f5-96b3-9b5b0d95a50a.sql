-- Fix inconsistent debt status: any debt with positive balance must not be marked closed
UPDATE public.debts
SET is_closed = false, closed_at = NULL, updated_at = now()
WHERE is_closed = true AND current_balance > 0;

-- Conversely, ensure debts with zero/negative balance are marked closed
UPDATE public.debts
SET is_closed = true, closed_at = COALESCE(closed_at, now()), updated_at = now()
WHERE is_closed = false AND current_balance <= 0;

-- Trigger to keep is_closed/closed_at consistent with current_balance on any update
CREATE OR REPLACE FUNCTION public.sync_debt_closed_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.current_balance > 0 THEN
    NEW.is_closed := false;
    NEW.closed_at := NULL;
  ELSE
    NEW.is_closed := true;
    IF NEW.closed_at IS NULL THEN NEW.closed_at := now(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS debts_sync_closed_state ON public.debts;
CREATE TRIGGER debts_sync_closed_state
BEFORE INSERT OR UPDATE OF current_balance ON public.debts
FOR EACH ROW EXECUTE FUNCTION public.sync_debt_closed_state();