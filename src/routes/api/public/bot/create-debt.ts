import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { botHandler } from "@/lib/bot/handler";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { rub } from "@/lib/bot/format";

const Schema = z.object({
  name: z.string().min(1).max(200),
  kind: z.enum(["loan", "mortgage", "credit_card", "personal", "other"]).default("loan"),
  initial_amount: z.number().positive().max(1e12),
  monthly_payment: z.number().positive().max(1e10).optional(),
  interest_rate: z.number().min(0).max(200).optional(),
  end_date: z.string().date().optional(),
  start_date: z.string().date().optional(),
  description: z.string().max(500).optional(),
});

export const Route = createFileRoute("/api/public/bot/create-debt")({
  server: {
    handlers: {
      POST: ({ request }) =>
        botHandler(request, async ({ userId, body }) => {
          const p = Schema.parse(body);
          const { error } = await supabaseAdmin.from("debts").insert({
            user_id: userId, name: p.name, kind: p.kind, initial_amount: p.initial_amount, current_balance: p.initial_amount,
            monthly_payment: p.monthly_payment ?? null, interest_rate: p.interest_rate ?? null, end_date: p.end_date ?? null,
            start_date: p.start_date ?? null, description: p.description ?? null,
          });
          if (error) throw new Error(error.message);
          return { ok: true, message: `Кредит «${p.name}» на ${rub(p.initial_amount)} создан` };
        }),
    },
  },
});