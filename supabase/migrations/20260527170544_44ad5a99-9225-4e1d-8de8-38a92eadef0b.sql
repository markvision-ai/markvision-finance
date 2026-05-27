
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO expense_categories (user_id, name, slug, color, icon) VALUES
    (NEW.id, 'Еда', 'food', '#ef4444', 'utensils'),
    (NEW.id, 'Транспорт', 'transport', '#3b82f6', 'car'),
    (NEW.id, 'Развлечения', 'entertainment', '#a855f7', 'film'),
    (NEW.id, 'Быт', 'household', '#10b981', 'home'),
    (NEW.id, 'Одежда', 'clothing', '#f59e0b', 'shirt'),
    (NEW.id, 'Здоровье', 'health', '#ec4899', 'heart-pulse'),
    (NEW.id, 'Прочее', 'other', '#6b7280', 'circle-ellipsis')
  ON CONFLICT (user_id, slug) DO NOTHING;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.seed_default_income_categories()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO income_categories (user_id, name, slug, color, icon) VALUES
    (NEW.id, 'Зарплата', 'salary', '#10b981', 'wallet'),
    (NEW.id, 'Фриланс', 'freelance', '#06b6d4', 'briefcase'),
    (NEW.id, 'Подарок', 'gift', '#a855f7', 'gift'),
    (NEW.id, 'Инвестиции', 'investments', '#f59e0b', 'trending-up'),
    (NEW.id, 'Прочее', 'other', '#6b7280', 'circle-ellipsis')
  ON CONFLICT (user_id, slug) DO NOTHING;
  RETURN NEW;
END $$;
