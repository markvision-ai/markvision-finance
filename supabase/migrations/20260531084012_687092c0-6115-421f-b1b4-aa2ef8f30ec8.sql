
-- 1) Fix mutable search_path
ALTER FUNCTION public.advance_next_payment_date() SET search_path = public;
ALTER FUNCTION public.get_or_create_link_code() SET search_path = public;
ALTER FUNCTION public.tg_set_zodiac() SET search_path = public;
ALTER FUNCTION public.unlink_telegram() SET search_path = public;
ALTER FUNCTION public.zodiac_from_date(date) SET search_path = public;

-- 2) Revoke EXECUTE on SECURITY DEFINER functions from anon/public
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon;',
                   fn.nspname, fn.proname, fn.args);
  END LOOP;
END $$;

-- Re-grant EXECUTE to authenticated for functions called by client RPC / app code
GRANT EXECUTE ON FUNCTION public.get_or_create_link_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_debt_payment() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_goal_contribution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_telegram() TO authenticated;

-- 3) Drop sensitive bot_token column from telegram_users so it cannot leak via Realtime
ALTER TABLE public.telegram_users DROP COLUMN IF EXISTS bot_token;

-- 4) Defense-in-depth restrictive policies on user_roles
DROP POLICY IF EXISTS user_roles_no_self_admin_grant ON public.user_roles;
CREATE POLICY user_roles_no_self_admin_grant
  ON public.user_roles AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (role <> 'admin'::public.app_role OR public.is_admin());

DROP POLICY IF EXISTS user_roles_no_self_admin_update ON public.user_roles;
CREATE POLICY user_roles_no_self_admin_update
  ON public.user_roles AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
