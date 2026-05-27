import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { botHandler } from "@/lib/bot/handler";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveEntity } from "@/lib/bot/resolve";
import { rub } from "@/lib/bot/format";

const Schema = z.object({
  amount: z.number().positive().max(1e10),
  goal_hint: z.string().max(500).optional(),
  goal_id: z.string().uuid().optional(),
  note: z.string().max(500).optional(),
  raw_text: z.string().max(2000).optional(),
});

export const Route = createFileRoute("/api/public/bot/goal-contribution")({
  server: {
    handlers: {
      POST: ({ request }) =>
        botHandler(request, async ({ userId, body }) => {
          const parsed = Schema.parse(body);
          let goalId = parsed.goal_id ?? null;
          if (!goalId) {
            const r = await resolveEntity({ userId, kind: "goal", text: parsed.goal_hint ?? parsed.raw_text ?? "" });
            if (!r.id || r.confidence < 0.5) return { ok: false, message: "Не понял, на какую цель. Уточни название." };
            goalId = r.id;
          }
          const { error } = await supabaseAdmin.from("goal_contributions").insert({
            user_id: userId, goal_id: goalId, amount: parsed.amount, note: parsed.note ?? null, source: "telegram", raw_text: parsed.raw_text ?? null,
          });
          if (error) throw new Error(error.message);
          const { data: g } = await supabaseAdmin.from("goals").select("name, current_amount, target_amount").eq("id", goalId).single();
          const cur = Number(g?.current_amount ?? 0); const tgt = Number(g?.target_amount ?? 0);
          const pct = tgt > 0 ? Math.round((cur / tgt) * 100) : 0;
          return { ok: true, message: `+${rub(parsed.amount)} на «${g?.name}». Прогресс: ${rub(cur)} / ${rub(tgt)} (${pct}%)` };
        }),
    },
  },
});