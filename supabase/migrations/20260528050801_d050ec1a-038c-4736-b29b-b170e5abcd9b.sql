
INSERT INTO public.expense_categories (user_id, name, slug, color, icon)
VALUES ('d9044eb2-5824-41b5-971a-f6ede381455e', 'Кредит', 'credit', '#ef4444', 'credit-card')
ON CONFLICT (user_id, slug) DO NOTHING;

UPDATE public.expenses
SET category_id = (SELECT id FROM public.expense_categories WHERE user_id='d9044eb2-5824-41b5-971a-f6ede381455e' AND slug='credit')
WHERE id='3a6cc898-c757-432b-ac3f-c2497103f2c5';
