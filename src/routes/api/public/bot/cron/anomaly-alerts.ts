import { createFileRoute } from "@tanstack/react-router";
import { verifyCronAuth } from "@/lib/bot/verify-signature";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTelegramMessage } from "@/lib/bot/tg";
import { rub } from "@/lib/bot/format";

export const Route = createFileRoute("/api/public/bot/cron/anomaly-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try { verifyCronAuth(request); } catch (e) { return e as Response; }
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const since30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
        const { data: users } = await supabaseAdmin.from("telegram_users").select("user_id, telegram_chat_id");
        let sent = 0;
        for (const u of users ?? []) {
          const userId = u.user_id as string;
          const chatId = Number(u.telegram_chat_id);
          const [{ data: today }, { data: hist }, { data: cats }] = await Promise.all([
            supabaseAdmin.from("expenses").select("category_id, amount").eq("user_id", userId).gte("occurred_at", startOfDay),
            supabaseAdmin.from("expenses").select("category_id, amount, occurred_at").eq("user_id", userId).gte("occurred_at", since30).lt("occurred_at", startOfDay),
            supabaseAdmin.from("expense_categories").select("id, name").eq("user_id", userId),
          ]);
          const todayByCat = new Map<string, number>();
          for (const e of today ?? []) {
            if (!e.category_id) continue;
            todayByCat.set(e.category_id, (todayByCat.get(e.category_id) ?? 0) + Number(e.amount));
          }
          const histByCat = new Map<string, number[]>();
          for (const e of hist ?? []) {
            if (!e.category_id) continue;
            const key = `${e.category_id}|${new Date(e.occurred_at).toDateString()}`;
            const arr = histByCat.get(key) ?? [];
            arr.push(Number(e.amount));
            histByCat.set(key, arr);
          }
          const dailyAvg = new Map<string, number>();
          const sums = new Map<string, { sum: number; days: Set<string> }>();
          for (const [key, arr] of histByCat) {
            const [catId, day] = key.split("|");
            const cur = sums.get(catId) ?? { sum: 0, days: new Set() };
            cur.sum += arr.reduce((s, n) => s + n, 0);
            cur.days.add(day);
            sums.set(catId, cur);
          }
          for (const [catId, v] of sums) dailyAvg.set(catId, v.sum / Math.max(v.days.size, 1));
          const alerts: string[] = [];
          for (const [catId, today] of todayByCat) {
            const avg = dailyAvg.get(catId) ?? 0;
            if (avg >= 200 && today > avg * 2) {
              const cat = (cats ?? []).find((c) => c.id === catId);
              alerts.push(`• ${cat?.name ?? "?"}: ${rub(today)} (обычно ${rub(avg)})`);
            }
          }
          if (alerts.length > 0) {
            await sendTelegramMessage(chatId, `<b>Сегодня тратишь больше обычного:</b>\n${alerts.join("\n")}`);
            sent++;
          }
        }
        return Response.json({ ok: true, sent });
      },
    },
  },
});