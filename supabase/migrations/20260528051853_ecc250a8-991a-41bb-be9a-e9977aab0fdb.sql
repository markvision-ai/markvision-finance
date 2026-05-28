
REVOKE EXECUTE ON FUNCTION public.debts_after_insert_reminders() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.debts_after_insert_reminders() TO service_role;
