
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['incomes','expenses','tasks','debts','debt_payments','goals','goal_contributions','income_categories','expense_categories']
  LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
