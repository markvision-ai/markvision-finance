import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { botHandler } from "@/lib/bot/handler";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { rub } from "@/lib/bot/format";
import { resolveCategoryId } from "@/lib/bot/resolve-category";

const Schema = z.object({
  amount: z.number().positive().max(1e10),
  description: z.string().max(500).optional().nullable(),
  category_slug: z.string().max(50).optional().nullable(),
  category_name: z.string().max(100).optional().nullable(),
  occurred_at: z.string().datetime().optional(),
  raw_text: z.string().max(2000).optional(),
});

export const Route = createFileRoute("/api/public/bot/expense")({
  server: {
    handlers: {
      POST: ({ request }) =>
        botHandler(request, async ({ userId, body }) => {
          const parsed = Schema.parse(body);
          const { id: categoryId, name: categoryName } =
            await resolveCategoryId("expense_categories", userId, {
              slug: parsed.category_slug,
              name: parsed.category_name,
            });
          const { data, error } = await supabaseAdmin
            .from("expenses")
            .insert({
              user_id: userId,
              amount: parsed.amount,
              description: parsed.description ?? null,
              category_id: categoryId,
              occurred_at: parsed.occurred_at ?? new Date().toISOString(),
              source: "telegram",
              raw_text: parsed.raw_text ?? null,
            })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          const cat = categoryName ? ` (${categoryName})` : "";
          return {
            ok: true,
            message: `Расход ${rub(parsed.amount)}${cat} записан`,
            data: { id: data.id },
          };
        }),
    },
  },
});