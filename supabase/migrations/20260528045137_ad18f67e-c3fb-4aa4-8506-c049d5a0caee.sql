DO $$
DECLARE
  old_user uuid := '51d6c21f-9f89-46d7-a145-fc666ed30965'::uuid;
  new_user uuid := 'd9044eb2-5824-41b5-971a-f6ede381455e'::uuid;
BEGIN
  UPDATE public.incomes i
  SET
    user_id = new_user,
    category_id = COALESCE((
      SELECT nc.id
      FROM public.income_categories oc
      JOIN public.income_categories nc
        ON nc.user_id = new_user
       AND (nc.slug = oc.slug OR lower(nc.name) = lower(oc.name))
      WHERE oc.id = i.category_id
      LIMIT 1
    ), i.category_id)
  WHERE i.user_id = old_user;

  UPDATE public.expenses e
  SET
    user_id = new_user,
    category_id = COALESCE((
      SELECT nc.id
      FROM public.expense_categories oc
      JOIN public.expense_categories nc
        ON nc.user_id = new_user
       AND (nc.slug = oc.slug OR lower(nc.name) = lower(oc.name))
      WHERE oc.id = e.category_id
      LIMIT 1
    ), e.category_id)
  WHERE e.user_id = old_user;

  UPDATE public.tasks
  SET user_id = new_user
  WHERE user_id = old_user
    AND source = 'telegram';

  UPDATE public.telegram_users
  SET user_id = new_user
  WHERE user_id = old_user;
END $$;