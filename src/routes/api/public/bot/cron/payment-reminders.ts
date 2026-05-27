import { createFileRoute } from "@tanstack/react-router";
import { verifyCronAuth } from "@/lib/bot/verify-signature";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTelegramMessage } from "@/lib/bot/tg";
import { rub } from "@/lib/bot/format";

export const Route = createFileRoute("/api/public/bot/cron/payment-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try { verifyCronAuth(request); } catch (e) { return e as Response; }
        const today = new Date();
        const dom = today.getDate();
        const { data: users } = await supabaseAdmin.from("telegram_users").select("user_id, telegram_chat_id");
        let sent = 0;
        for (const u of users ?? []) {
          const userId = u.user_id as string;
          const chatId = Number(u.telegram_chat_id);
          const { data: debts } = await supabaseAdmin.from("debts").select("name, monthly_payment, start_date").eq("user_id", userId).eq("is_closed", false).not("monthly_payment", "is", null);
          const due: string[] = [];
          for (const d of debts ?? []) {
            if (!d.start_date) continue;
            const startDom = new Date(d.start_date).getDate();
            const diff = startDom - dom;
            if (diff >= 0 && diff <= 3) {
              due.push(`• «${d.name}» — ${rub(Number(d.monthly_payment))} через ${diff} дн.`);
            }
          }
          if (due.length > 0) {
            await sendTelegramMessage(chatId, `<b>Скоро платежи по кредитам:</b>\n${due.join("\n")}`);
            sent++;
          }
        }
        return Response.json({ ok: true, sent });
      },
    },
  },
});