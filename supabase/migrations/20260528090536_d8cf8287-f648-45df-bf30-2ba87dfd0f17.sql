CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  telegram_chat_id bigint,
  telegram_username text,
  roles text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    u.id,
    u.email::text,
    (u.raw_user_meta_data ->> 'display_name')::text AS display_name,
    u.created_at,
    u.last_sign_in_at,
    tg.telegram_chat_id,
    tg.username::text AS telegram_username,
    COALESCE(
      ARRAY_AGG(ur.role::text ORDER BY ur.role::text) FILTER (WHERE ur.role IS NOT NULL),
      ARRAY[]::text[]
    ) AS roles
  FROM auth.users u
  LEFT JOIN public.telegram_users tg ON tg.user_id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
  GROUP BY u.id, u.email, u.raw_user_meta_data, u.created_at, u.last_sign_in_at, tg.telegram_chat_id, tg.username
  ORDER BY u.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;