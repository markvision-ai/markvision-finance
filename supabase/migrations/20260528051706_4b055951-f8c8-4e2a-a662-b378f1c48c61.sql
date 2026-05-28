
CREATE TABLE IF NOT EXISTS public.debt_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  debt_id uuid NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  due_date date NOT NULL,
  expected_amount numeric NOT NULL,
  paid_at timestamptz NULL,
  paid_amount numeric NULL,
  payment_id uuid NULL REFERENCES public.debt_payments(id) ON DELETE SET NULL,
  dismissed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (debt_id, due_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.debt_reminders TO authenticated;
GRANT ALL ON public.debt_reminders TO service_role;

ALTER TABLE public.debt_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_debt_reminders" ON public.debt_reminders
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_reminders;
ALTER TABLE public.debt_reminders REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_debt_reminders_user_due ON public.debt_reminders(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_debt_reminders_unpaid ON public.debt_reminders(user_id) WHERE paid_at IS NULL;

-- Generate reminders for all active debts (past 12 months + next 3 months)
CREATE OR REPLACE FUNCTION public.ensure_debt_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d record;
  m int;
  due date;
  pay_day int;
  base date;
  last_day int;
  actual_day int;
BEGIN
  FOR d IN
    SELECT id, user_id, start_date, monthly_payment, current_balance, is_closed
    FROM public.debts
    WHERE is_closed = false
      AND start_date IS NOT NULL
      AND monthly_payment IS NOT NULL
      AND monthly_payment > 0
  LOOP
    pay_day := EXTRACT(DAY FROM d.start_date)::int;
    FOR m IN -12..3 LOOP
      base := date_trunc('month', (CURRENT_DATE + (m || ' month')::interval))::date;
      last_day := EXTRACT(DAY FROM (base + interval '1 month' - interval '1 day'))::int;
      actual_day := LEAST(pay_day, last_day);
      due := base + (actual_day - 1);
      IF due < d.start_date THEN CONTINUE; END IF;
      INSERT INTO public.debt_reminders (user_id, debt_id, due_date, expected_amount)
      VALUES (d.user_id, d.id, due, d.monthly_payment)
      ON CONFLICT (debt_id, due_date) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_debt_reminders() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_debt_reminders() TO service_role;

-- Trigger auto-fill when a new debt is added
CREATE OR REPLACE FUNCTION public.debts_after_insert_reminders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_debt_reminders();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_debts_after_insert_reminders ON public.debts;
CREATE TRIGGER trg_debts_after_insert_reminders
AFTER INSERT OR UPDATE OF start_date, monthly_payment, is_closed ON public.debts
FOR EACH ROW EXECUTE FUNCTION public.debts_after_insert_reminders();

-- Backfill once
SELECT public.ensure_debt_reminders();
