
-- Ensure uniqueness for upserts
CREATE UNIQUE INDEX IF NOT EXISTS expense_categories_user_slug_uniq
  ON public.expense_categories (user_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS income_categories_user_slug_uniq
  ON public.income_categories (user_id, slug);

-- Update expense seed function
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.expense_categories (user_id, name, slug, color, icon) VALUES
    (NEW.id, 'Еда',           'food',           '#ef4444', 'utensils'),
    (NEW.id, 'Продукты',      'groceries',      '#f97316', 'shopping-basket'),
    (NEW.id, 'Кафе и рестораны','cafe',         '#fb7185', 'coffee'),
    (NEW.id, 'Транспорт',     'transport',      '#3b82f6', 'car'),
    (NEW.id, 'Топливо',       'fuel',           '#0ea5e9', 'fuel'),
    (NEW.id, 'Развлечения',   'entertainment',  '#a855f7', 'film'),
    (NEW.id, 'Быт',           'household',      '#10b981', 'home'),
    (NEW.id, 'Коммуналка',    'utilities',      '#14b8a6', 'plug'),
    (NEW.id, 'Одежда',        'clothing',       '#f59e0b', 'shirt'),
    (NEW.id, 'Здоровье',      'health',         '#ec4899', 'heart-pulse'),
    (NEW.id, 'Красота',       'beauty',         '#e879f9', 'sparkles'),
    (NEW.id, 'Образование',   'education',      '#6366f1', 'graduation-cap'),
    (NEW.id, 'Ребёнок',       'child',          '#fbbf24', 'baby'),
    (NEW.id, 'Жена',          'wife',           '#f43f5e', 'heart'),
    (NEW.id, 'Питомцы',       'pets',           '#84cc16', 'paw-print'),
    (NEW.id, 'Подарки',       'gifts',          '#d946ef', 'gift'),
    (NEW.id, 'Путешествия',   'travel',         '#06b6d4', 'plane'),
    (NEW.id, 'Спорт',         'sports',         '#22c55e', 'dumbbell'),
    (NEW.id, 'Подписки',      'subscriptions',  '#8b5cf6', 'repeat'),
    (NEW.id, 'Техника',       'tech',           '#64748b', 'laptop'),
    (NEW.id, 'Аренда',        'rent',           '#0891b2', 'key-round'),
    (NEW.id, 'Налоги',        'taxes',          '#475569', 'landmark'),
    (NEW.id, 'Прочее',        'other',          '#6b7280', 'circle-ellipsis')
  ON CONFLICT (user_id, slug) DO NOTHING;
  RETURN NEW;
END
$function$;

-- Update income seed function
CREATE OR REPLACE FUNCTION public.seed_default_income_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.income_categories (user_id, name, slug, color, icon) VALUES
    (NEW.id, 'Зарплата',           'salary',       '#10b981', 'wallet'),
    (NEW.id, 'Фриланс',            'freelance',    '#06b6d4', 'briefcase'),
    (NEW.id, 'Диагностика',        'diagnostics',  '#0ea5e9', 'stethoscope'),
    (NEW.id, 'Оплата за работу',   'service',      '#22c55e', 'hand-coins'),
    (NEW.id, 'От клиента',         'client',       '#14b8a6', 'user-check'),
    (NEW.id, 'Бизнес',             'business',     '#3b82f6', 'building-2'),
    (NEW.id, 'Подарок',            'gift',         '#a855f7', 'gift'),
    (NEW.id, 'Инвестиции',         'investments',  '#f59e0b', 'trending-up'),
    (NEW.id, 'Дивиденды',          'dividends',    '#eab308', 'pie-chart'),
    (NEW.id, 'Аренда',             'rent_income',  '#0891b2', 'key-round'),
    (NEW.id, 'Кэшбэк',             'cashback',     '#84cc16', 'badge-percent'),
    (NEW.id, 'Возврат',            'refund',       '#f43f5e', 'undo-2'),
    (NEW.id, 'Прочее',             'other',        '#6b7280', 'circle-ellipsis')
  ON CONFLICT (user_id, slug) DO NOTHING;
  RETURN NEW;
END
$function$;

-- Backfill for all existing users
INSERT INTO public.expense_categories (user_id, name, slug, color, icon)
SELECT u.id, v.name, v.slug, v.color, v.icon
FROM auth.users u
CROSS JOIN (VALUES
  ('Еда','food','#ef4444','utensils'),
  ('Продукты','groceries','#f97316','shopping-basket'),
  ('Кафе и рестораны','cafe','#fb7185','coffee'),
  ('Транспорт','transport','#3b82f6','car'),
  ('Топливо','fuel','#0ea5e9','fuel'),
  ('Развлечения','entertainment','#a855f7','film'),
  ('Быт','household','#10b981','home'),
  ('Коммуналка','utilities','#14b8a6','plug'),
  ('Одежда','clothing','#f59e0b','shirt'),
  ('Здоровье','health','#ec4899','heart-pulse'),
  ('Красота','beauty','#e879f9','sparkles'),
  ('Образование','education','#6366f1','graduation-cap'),
  ('Ребёнок','child','#fbbf24','baby'),
  ('Жена','wife','#f43f5e','heart'),
  ('Питомцы','pets','#84cc16','paw-print'),
  ('Подарки','gifts','#d946ef','gift'),
  ('Путешествия','travel','#06b6d4','plane'),
  ('Спорт','sports','#22c55e','dumbbell'),
  ('Подписки','subscriptions','#8b5cf6','repeat'),
  ('Техника','tech','#64748b','laptop'),
  ('Аренда','rent','#0891b2','key-round'),
  ('Налоги','taxes','#475569','landmark'),
  ('Прочее','other','#6b7280','circle-ellipsis')
) AS v(name,slug,color,icon)
ON CONFLICT (user_id, slug) DO NOTHING;

INSERT INTO public.income_categories (user_id, name, slug, color, icon)
SELECT u.id, v.name, v.slug, v.color, v.icon
FROM auth.users u
CROSS JOIN (VALUES
  ('Зарплата','salary','#10b981','wallet'),
  ('Фриланс','freelance','#06b6d4','briefcase'),
  ('Диагностика','diagnostics','#0ea5e9','stethoscope'),
  ('Оплата за работу','service','#22c55e','hand-coins'),
  ('От клиента','client','#14b8a6','user-check'),
  ('Бизнес','business','#3b82f6','building-2'),
  ('Подарок','gift','#a855f7','gift'),
  ('Инвестиции','investments','#f59e0b','trending-up'),
  ('Дивиденды','dividends','#eab308','pie-chart'),
  ('Аренда','rent_income','#0891b2','key-round'),
  ('Кэшбэк','cashback','#84cc16','badge-percent'),
  ('Возврат','refund','#f43f5e','undo-2'),
  ('Прочее','other','#6b7280','circle-ellipsis')
) AS v(name,slug,color,icon)
ON CONFLICT (user_id, slug) DO NOTHING;
