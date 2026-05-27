
-- Fix 1: Tighten RLS so users can't insert payments/contributions against debts/goals they don't own
DROP POLICY IF EXISTS own_debt_payments ON public.debt_payments;
CREATE POLICY own_debt_payments ON public.debt_payments
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.debts WHERE id = debt_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS own_goal_contributions ON public.goal_contributions;
CREATE POLICY own_goal_contributions ON public.goal_contributions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.goals WHERE id = goal_id AND user_id = auth.uid())
  );

-- Fix 2: Revoke EXECUTE on SECURITY DEFINER functions from PostgREST roles.
-- These functions are only meant to be invoked by triggers or by service_role.
REVOKE EXECUTE ON FUNCTION public.apply_debt_payment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_goal_contribution() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_default_categories() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_default_income_categories() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_by_chat_id(bigint) FROM PUBLIC, anon, authenticated;
