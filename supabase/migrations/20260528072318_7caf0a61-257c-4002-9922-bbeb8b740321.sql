-- Add "Обучение" to seed function for new users
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
    (NEW.id, 'Обучение',      'learning',       '#8b5cf6', 'book-open'),
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

-- Backfill for existing users
INSERT INTO public.expense_categories (user_id, name, slug, color, icon)
SELECT DISTINCT user_id, 'Обучение', 'learning', '#8b5cf6', 'book-open'
FROM public.expense_categories
ON CONFLICT (user_id, slug) DO NOTHING;