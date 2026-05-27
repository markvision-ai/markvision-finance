
-- Lock down SECURITY DEFINER functions: they should not be callable via PostgREST.
-- Trigger functions are called by the DB itself; helper is called server-side via service_role.

REVOKE EXECUTE ON FUNCTION public.apply_debt_payment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_goal_contribution() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_default_categories() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_default_income_categories() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_by_chat_id(bigint) FROM PUBLIC, anon, authenticated;

-- service_role keeps EXECUTE (it has ALL by default for owner-created functions),
-- and triggers run with definer privileges regardless of grantee.
GRANT EXECUTE ON FUNCTION public.get_user_by_chat_id(bigint) TO service_role;
