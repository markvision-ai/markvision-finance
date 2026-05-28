import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await (supabase as any).rpc("admin_list_users");
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{
      id: string;
      email: string | null;
      display_name: string | null;
      created_at: string;
      last_sign_in_at: string | null;
      telegram_chat_id: number | null;
      telegram_username: string | null;
      roles: string[] | null;
    }>;
    return {
      users: rows.map((u) => ({
        id: u.id,
        email: u.email,
        display_name: u.display_name,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        telegram_chat_id: u.telegram_chat_id,
        telegram_username: u.telegram_username,
        roles: u.roles ?? [],
      })),
    };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden");
    if (data.userId === userId) throw new Error("Нельзя удалить самого себя");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });