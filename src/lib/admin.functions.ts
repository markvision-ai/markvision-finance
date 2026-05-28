import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // Verify admin role
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) throw new Error("Forbidden: admin only");

    // List all auth users
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authErr) throw new Error(authErr.message);

    // Telegram links
    const { data: tgRows } = await supabaseAdmin
      .from("telegram_users")
      .select("user_id, telegram_chat_id, username, created_at");
    const tgMap = new Map((tgRows ?? []).map((r) => [r.user_id as string, r]));

    // Roles
    const { data: roleRows } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const rolesMap = new Map<string, string[]>();
    for (const r of roleRows ?? []) {
      const arr = rolesMap.get(r.user_id as string) ?? [];
      arr.push(r.role as string);
      rolesMap.set(r.user_id as string, arr);
    }

    return {
      users: authData.users.map((u) => {
        const tg = tgMap.get(u.id);
        return {
          id: u.id,
          email: u.email ?? null,
          display_name: (u.user_metadata as any)?.display_name ?? null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          telegram_chat_id: tg?.telegram_chat_id ?? null,
          telegram_username: tg?.username ?? null,
          roles: rolesMap.get(u.id) ?? [],
        };
      }),
    };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });