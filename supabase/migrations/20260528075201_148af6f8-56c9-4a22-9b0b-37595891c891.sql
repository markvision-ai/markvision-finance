-- 1. Сделать chat_id nullable (теперь можно создавать запись без chat_id, только с username)
ALTER TABLE public.telegram_users ALTER COLUMN telegram_chat_id DROP NOT NULL;

-- 2. Уникальные индексы
CREATE UNIQUE INDEX IF NOT EXISTS telegram_users_user_id_uniq ON public.telegram_users (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS telegram_users_chat_id_uniq ON public.telegram_users (telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS telegram_users_username_lower_uniq ON public.telegram_users (LOWER(username)) WHERE username IS NOT NULL;

-- 3. Автосоздание записи telegram_users при регистрации
CREATE OR REPLACE FUNCTION public.seed_telegram_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.telegram_users (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_telegram ON auth.users;
CREATE TRIGGER on_auth_user_created_telegram
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.seed_telegram_user();

-- 4. Бэкфилл существующих пользователей
INSERT INTO public.telegram_users (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 5. Резолв по username (с поддержкой @prefix, case-insensitive)
CREATE OR REPLACE FUNCTION public.get_user_by_username(p_username text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.telegram_users
  WHERE LOWER(username) = LOWER(regexp_replace(COALESCE(p_username, ''), '^@', ''))
  LIMIT 1;
$$;

-- 6. Привязка chat_id по username (бот вызывает при первом сообщении)
CREATE OR REPLACE FUNCTION public.link_chat_id_by_username(p_username text, p_chat_id bigint)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  UPDATE public.telegram_users
    SET telegram_chat_id = p_chat_id
    WHERE LOWER(username) = LOWER(regexp_replace(COALESCE(p_username, ''), '^@', ''))
      AND (telegram_chat_id IS NULL OR telegram_chat_id = p_chat_id)
    RETURNING user_id INTO v_user_id;
  RETURN v_user_id;
END;
$$;

-- 7. Роли (отдельная таблица — никогда не хранить роль в profiles!)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own roles" ON public.user_roles;
CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;