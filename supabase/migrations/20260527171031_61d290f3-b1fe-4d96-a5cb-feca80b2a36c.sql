CREATE UNIQUE INDEX IF NOT EXISTS income_categories_user_id_slug_key
ON public.income_categories (user_id, slug);

CREATE OR REPLACE FUNCTION public.seed_default_income_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.income_categories (user_id, name, slug, color, icon) VALUES
    (NEW.id, 'Зарплата', 'salary', '#10b981', 'wallet'),
    (NEW.id, 'Фриланс', 'freelance', '#06b6d4', 'briefcase'),
    (NEW.id, 'Подарок', 'gift', '#a855f7', 'gift'),
    (NEW.id, 'Инвестиции', 'investments', '#f59e0b', 'trending-up'),
    (NEW.id, 'Прочее', 'other', '#6b7280', 'circle-ellipsis')
  ON CONFLICT (user_id, slug) DO NOTHING;

  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.expense_categories (user_id, name, slug, color, icon) VALUES
    (NEW.id, 'Еда', 'food', '#ef4444', 'utensils'),
    (NEW.id, 'Транспорт', 'transport', '#3b82f6', 'car'),
    (NEW.id, 'Развлечения', 'entertainment', '#a855f7', 'film'),
    (NEW.id, 'Быт', 'household', '#10b981', 'home'),
    (NEW.id, 'Одежда', 'clothing', '#f59e0b', 'shirt'),
    (NEW.id, 'Здоровье', 'health', '#ec4899', 'heart-pulse'),
    (NEW.id, 'Прочее', 'other', '#6b7280', 'circle-ellipsis')
  ON CONFLICT (user_id, slug) DO NOTHING;

  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS seed_default_categories_on_signup ON auth.users;
CREATE TRIGGER seed_default_categories_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.seed_default_categories();

DROP TRIGGER IF EXISTS seed_default_income_categories_on_signup ON auth.users;
CREATE TRIGGER seed_default_income_categories_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.seed_default_income_categories();