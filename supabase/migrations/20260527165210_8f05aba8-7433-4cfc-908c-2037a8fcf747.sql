
-- ============ INCOME CATEGORIES ============
CREATE TABLE public.income_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  color text NOT NULL DEFAULT '#10b981',
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_categories TO authenticated;
GRANT ALL ON public.income_categories TO service_role;
ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_income_categories ON public.income_categories
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ INCOMES ============
CREATE TABLE public.incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'RUB',
  category_id uuid,
  client_name text,
  description text,
  raw_text text,
  source text,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_incomes_user_received ON public.incomes(user_id, received_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incomes TO authenticated;
GRANT ALL ON public.incomes TO service_role;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_incomes ON public.incomes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ DEBTS ============
CREATE TABLE public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'loan',
  initial_amount numeric NOT NULL,
  current_balance numeric NOT NULL,
  currency text NOT NULL DEFAULT 'RUB',
  interest_rate numeric,
  monthly_payment numeric,
  start_date date,
  end_date date,
  is_closed boolean NOT NULL DEFAULT false,
  closed_at timestamptz,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.debts TO authenticated;
GRANT ALL ON public.debts TO service_role;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_debts ON public.debts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ DEBT PAYMENTS ============
CREATE TABLE public.debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  debt_id uuid NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  raw_text text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_debt_payments_debt ON public.debt_payments(debt_id, paid_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.debt_payments TO authenticated;
GRANT ALL ON public.debt_payments TO service_role;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_debt_payments ON public.debt_payments
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ GOAL CONTRIBUTIONS ============
CREATE TABLE public.goal_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  note text,
  raw_text text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_goal_contributions_goal ON public.goal_contributions(goal_id, occurred_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_contributions TO authenticated;
GRANT ALL ON public.goal_contributions TO service_role;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_goal_contributions ON public.goal_contributions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ GOALS: add is_archived if missing ============
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.apply_debt_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.debts
      SET current_balance = GREATEST(current_balance - NEW.amount, 0),
          is_closed = (current_balance - NEW.amount <= 0),
          closed_at = CASE WHEN current_balance - NEW.amount <= 0 THEN now() ELSE closed_at END,
          updated_at = now()
      WHERE id = NEW.debt_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.debts
      SET current_balance = current_balance + OLD.amount,
          is_closed = false,
          closed_at = NULL,
          updated_at = now()
      WHERE id = OLD.debt_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_debt_payment_apply ON public.debt_payments;
CREATE TRIGGER trg_debt_payment_apply
AFTER INSERT OR DELETE ON public.debt_payments
FOR EACH ROW EXECUTE FUNCTION public.apply_debt_payment();

CREATE OR REPLACE FUNCTION public.apply_goal_contribution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.goals SET current_amount = current_amount + NEW.amount, updated_at = now() WHERE id = NEW.goal_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.goals SET current_amount = current_amount - OLD.amount, updated_at = now() WHERE id = OLD.goal_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_goal_contribution_apply ON public.goal_contributions;
CREATE TRIGGER trg_goal_contribution_apply
AFTER INSERT OR DELETE ON public.goal_contributions
FOR EACH ROW EXECUTE FUNCTION public.apply_goal_contribution();

-- ============ SEED DEFAULT INCOME CATEGORIES ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.seed_default_income_categories()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO income_categories (user_id, name, slug, color, icon) VALUES
    (NEW.id, 'Зарплата', 'salary', '#10b981', 'wallet'),
    (NEW.id, 'Фриланс', 'freelance', '#06b6d4', 'briefcase'),
    (NEW.id, 'Подарок', 'gift', '#a855f7', 'gift'),
    (NEW.id, 'Инвестиции', 'investments', '#f59e0b', 'trending-up'),
    (NEW.id, 'Прочее', 'other', '#6b7280', 'circle-ellipsis');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_seed_income_categories ON auth.users;
CREATE TRIGGER trg_seed_income_categories
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.seed_default_income_categories();

-- Ensure expense categories trigger also exists on auth.users
DROP TRIGGER IF EXISTS trg_seed_expense_categories ON auth.users;
CREATE TRIGGER trg_seed_expense_categories
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories();

-- ============ VIEWS ============
CREATE OR REPLACE VIEW public.monthly_balance
WITH (security_invoker = true) AS
SELECT
  user_id,
  date_trunc('month', m)::date AS month,
  COALESCE((SELECT SUM(amount) FROM public.incomes i
            WHERE i.user_id = mb.user_id AND date_trunc('month', i.received_at) = mb.m), 0) AS income_total,
  COALESCE((SELECT SUM(amount) FROM public.expenses e
            WHERE e.user_id = mb.user_id AND date_trunc('month', e.occurred_at) = mb.m), 0) AS expense_total,
  COALESCE((SELECT SUM(amount) FROM public.incomes i
            WHERE i.user_id = mb.user_id AND date_trunc('month', i.received_at) = mb.m), 0)
  - COALESCE((SELECT SUM(amount) FROM public.expenses e
              WHERE e.user_id = mb.user_id AND date_trunc('month', e.occurred_at) = mb.m), 0) AS balance
FROM (
  SELECT DISTINCT user_id, date_trunc('month', d)::timestamptz AS m
  FROM (
    SELECT user_id, occurred_at AS d FROM public.expenses
    UNION ALL
    SELECT user_id, received_at AS d FROM public.incomes
  ) all_tx
) mb;

GRANT SELECT ON public.monthly_balance TO authenticated;

CREATE OR REPLACE VIEW public.debts_summary
WITH (security_invoker = true) AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE NOT is_closed) AS active_count,
  COALESCE(SUM(current_balance) FILTER (WHERE NOT is_closed), 0) AS total_remaining,
  COALESCE(SUM(initial_amount) FILTER (WHERE NOT is_closed), 0) AS total_initial,
  COALESCE(SUM(monthly_payment) FILTER (WHERE NOT is_closed), 0) AS total_monthly
FROM public.debts
GROUP BY user_id;

GRANT SELECT ON public.debts_summary TO authenticated;
