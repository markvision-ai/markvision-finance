
DO $$ BEGIN
  ALTER TABLE public.incomes ADD CONSTRAINT incomes_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.income_categories(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.debt_payments ADD CONSTRAINT debt_payments_debt_id_fkey FOREIGN KEY (debt_id) REFERENCES public.debts(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.goal_contributions ADD CONSTRAINT goal_contributions_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.goals ADD CONSTRAINT goals_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
