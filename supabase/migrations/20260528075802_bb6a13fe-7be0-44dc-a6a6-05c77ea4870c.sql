INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'zapoinov@bk.ru'
ON CONFLICT (user_id, role) DO NOTHING;