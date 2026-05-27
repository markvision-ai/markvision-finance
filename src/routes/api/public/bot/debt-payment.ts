import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { botHandler } from "@/lib/bot/handler";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveEntity } from "@/lib/bot/resolve";
import { rub } from "@/lib/bot/format";

const Schema = z.object({
  amount: z.number().positive().max(1e10),
  debt_hint: z.string().max(500).optional(),
  debt_id: z.string().uuid().optional(),
  raw_text: z.string().max(2000).optional(),
});

export const Route = createFileRoute("/api/public/bot/debt-payment")({
  server: {
    handlers: {
      POST: ({ request }) =>
        botHandler(request, async ({ userId, body }) => {
          const parsed = Schema.parse(body);
          let debtId = parsed.debt_id ?? null;
          if (!debtId) {
            const hint = parsed.debt_hint ?? parsed.raw_text ?? "";
            const r = await resolveEntity({ userId, kind: "debt", text: hint });
            if (!r.id || r.confidence < 0.5) return { ok: false, message: "Не понял, по какому кредиту платёж. Уточни название." };
            debtId = r.id;
          }
          const { error } = await supabaseAdmin.from("debt_payments").insert({
            user_id: userId,
            debt_id: debtId,
            amount: parsed.amount,
            source: "telegram",
            raw_text: parsed.raw_text ?? null,
          });
          if (error) throw new Error(error.message);
          const { data: debt } = await supabaseAdmin.from("debts").select("name, current_balance").eq("id", debtId).single();
          return { ok: true, message: `Платёж ${rub(parsed.amount)} по «${debt?.name}» записан. Остаток: ${rub(Number(debt?.current_balance ?? 0))}` };
        }),
    },
  },
});