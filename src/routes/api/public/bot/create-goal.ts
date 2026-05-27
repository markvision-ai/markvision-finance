import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { botHandler } from "@/lib/bot/handler";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { rub } from "@/lib/bot/format";

const Schema = z.object({
  name: z.string().min(1).max(200),
  target_amount: z.number().positive().max(1e12),
  target_date: z.string().date().optional(),
  description: z.string().max(500).optional(),
  kind: z.string().max(50).default("savings"),
});

export const Route = createFileRoute("/api/public/bot/create-goal")({
  server: {
    handlers: {
      POST: ({ request }) =>
        botHandler(request, async ({ userId, body }) => {
          const p = Schema.parse(body);
          const { error } = await supabaseAdmin.from("goals").insert({
            user_id: userId, name: p.name, kind: p.kind, target_amount: p.target_amount, target_date: p.target_date ?? null, description: p.description ?? null,
          });
          if (error) throw new Error(error.message);
          return { ok: true, message: `Цель «${p.name}» (${rub(p.target_amount)}) создана` };
        }),
    },
  },
});