import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { botHandler } from "@/lib/bot/handler";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callAiJSON } from "@/lib/bot/ai";
import { resolveEntity } from "@/lib/bot/resolve";
import { rub } from "@/lib/bot/format";

const Schema = z.object({ text: z.string().min(1).max(2000) });

type Intent =
  | { kind: "spent_today" }
  | { kind: "spent_month" }
  | { kind: "income_month" }
  | { kind: "debt_balance"; hint: string }
  | { kind: "goal_progress"; hint: string }
  | { kind: "category_total"; category: string; period: "today" | "week" | "month" }
  | { kind: "unknown" };

async function classify(text: string): Promise<Intent> {
  return await callAiJSON<Intent>({
    system: "Классифицируй запрос пользователя о его финансах.",
    user: text,
    schemaName: "classify_status",
    schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["spent_today", "spent_month", "income_month", "debt_balance", "goal_progress", "category_total", "unknown"] },
        hint: { type: "string" },
        category: { type: "string" },
        period: { type: "string", enum: ["today", "week", "month"] },
      },
      required: ["kind"],
    },
  });
}

export const Route = createFileRoute("/api/public/bot/status-query")({
  server: {
    handlers: {
      POST: ({ request }) =>
        botHandler(request, async ({ userId, body }) => {
          const { text } = Schema.parse(body);
          const intent = await classify(text);
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          const startOfWeek = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();

          const sum = (rows: { amount: number }[]) => rows.reduce((s, r) => s + Number(r.amount), 0);

          if (intent.kind === "spent_today" || intent.kind === "spent_month") {
            const since = intent.kind === "spent_today" ? startOfDay : startOfMonth;
            const { data } = await supabaseAdmin.from("expenses").select("amount").eq("user_id", userId).gte("occurred_at", since);
            const total = sum((data ?? []) as { amount: number }[]);
            return { ok: true, message: `Потрачено ${intent.kind === "spent_today" ? "сегодня" : "за месяц"}: ${rub(total)}` };
          }
          if (intent.kind === "income_month") {
            const { data } = await supabaseAdmin.from("incomes").select("amount").eq("user_id", userId).gte("received_at", startOfMonth);
            return { ok: true, message: `Доход за месяц: ${rub(sum((data ?? []) as { amount: number }[]))}` };
          }
          if (intent.kind === "debt_balance") {
            const r = await resolveEntity({ userId, kind: "debt", text: intent.hint || text });
            if (!r.id) return { ok: false, message: "Не нашёл такой кредит" };
            const { data } = await supabaseAdmin.from("debts").select("name, current_balance, monthly_payment").eq("id", r.id).single();
            const mp = data?.monthly_payment ? `, платёж ${rub(Number(data.monthly_payment))}/мес` : "";
            return { ok: true, message: `«${data?.name}»: остаток ${rub(Number(data?.current_balance ?? 0))}${mp}` };
          }
          if (intent.kind === "goal_progress") {
            const r = await resolveEntity({ userId, kind: "goal", text: intent.hint || text });
            if (!r.id) return { ok: false, message: "Не нашёл такую цель" };
            const { data } = await supabaseAdmin.from("goals").select("name, current_amount, target_amount").eq("id", r.id).single();
            const cur = Number(data?.current_amount ?? 0); const tgt = Number(data?.target_amount ?? 0);
            const left = Math.max(tgt - cur, 0); const pct = tgt > 0 ? Math.round((cur / tgt) * 100) : 0;
            return { ok: true, message: `«${data?.name}»: ${rub(cur)} / ${rub(tgt)} (${pct}%). Осталось ${rub(left)}` };
          }
          if (intent.kind === "category_total") {
            const since = intent.period === "today" ? startOfDay : intent.period === "week" ? startOfWeek : startOfMonth;
            const { data: cat } = await supabaseAdmin.from("expense_categories").select("id, name").eq("user_id", userId).ilike("name", `%${intent.category}%`).maybeSingle();
            if (!cat) return { ok: false, message: `Категория «${intent.category}» не найдена` };
            const { data } = await supabaseAdmin.from("expenses").select("amount").eq("user_id", userId).eq("category_id", cat.id).gte("occurred_at", since);
            return { ok: true, message: `«${cat.name}» за ${intent.period === "today" ? "сегодня" : intent.period === "week" ? "неделю" : "месяц"}: ${rub(sum((data ?? []) as { amount: number }[]))}` };
          }
          return { ok: false, message: "Не понял вопрос. Попробуй: «сколько потратил сегодня», «остаток по ипотеке», «прогресс по цели»." };
        }),
    },
  },
});