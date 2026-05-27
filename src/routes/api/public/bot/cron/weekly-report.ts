import { createFileRoute } from "@tanstack/react-router";
import { verifyCronAuth } from "@/lib/bot/verify-signature";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTelegramMessage } from "@/lib/bot/tg";
import { rub } from "@/lib/bot/format";

export const Route = createFileRoute("/api/public/bot/cron/weekly-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try { verifyCronAuth(request); } catch (e) { return e as Response; }
        const { data: users } = await supabaseAdmin.from("telegram_users").select("user_id, telegram_chat_id");
        const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        let sent = 0;
        for (const u of users ?? []) {
          const userId = u.user_id as string;
          const chatId = Number(u.telegram_chat_id);
          const [{ data: exp }, { data: inc }, { data: goals }] = await Promise.all([
            supabaseAdmin.from("expenses").select("amount").eq("user_id", userId).gte("occurred_at", since),
            supabaseAdmin.from("incomes").select("amount").eq("user_id", userId).gte("received_at", since),
            supabaseAdmin.from("goals").select("name, current_amount, target_amount").eq("user_id", userId).eq("is_archived", false).limit(5),
          ]);
          const expTotal = (exp ?? []).reduce((s, r) => s + Number(r.amount), 0);
          const incTotal = (inc ?? []).reduce((s, r) => s + Number(r.amount), 0);
          const goalLines = (goals ?? []).map((g) => {
            const c = Number(g.current_amount); const t = Number(g.target_amount);
            const pct = t > 0 ? Math.round((c / t) * 100) : 0;
            return `• ${g.name}: ${pct}% (${rub(c)}/${rub(t)})`;
          }).join("\n");
          const msg = `<b>Итоги недели</b>\n\nРасходы: ${rub(expTotal)}\nДоходы: ${rub(incTotal)}\nБаланс: ${rub(incTotal - expTotal)}${goalLines ? `\n\n<b>Цели:</b>\n${goalLines}` : ""}`;
          await sendTelegramMessage(chatId, msg);
          sent++;
        }
        return Response.json({ ok: true, sent });
      },
    },
  },
});