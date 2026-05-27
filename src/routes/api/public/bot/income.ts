import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { botHandler } from "@/lib/bot/handler";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { rub } from "@/lib/bot/format";
import { resolveCategoryId } from "@/lib/bot/resolve-category";

const Schema = z.object({
  amount: z.number().positive().max(1e10),
  client_name: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  category_slug: z.string().max(50).optional().nullable(),
  category_name: z.string().max(100).optional().nullable(),
  received_at: z.string().datetime().optional(),
  raw_text: z.string().max(2000).optional(),
});

export const Route = createFileRoute("/api/public/bot/income")({
  server: {
    handlers: {
      POST: ({ request }) =>
        botHandler(request, async ({ userId, body }) => {
          const parsed = Schema.parse(body);
          const { id: categoryId } = await resolveCategoryId(
            "income_categories",
            userId,
            { slug: parsed.category_slug, name: parsed.category_name },
          );
          const { data, error } = await supabaseAdmin.from("incomes").insert({
            user_id: userId,
            amount: parsed.amount,
            client_name: parsed.client_name ?? null,
            description: parsed.description ?? null,
            category_id: categoryId,
            received_at: parsed.received_at ?? new Date().toISOString(),
            source: "telegram",
            raw_text: parsed.raw_text ?? null,
          }).select("id").single();
          if (error) throw new Error(error.message);
          const who = parsed.client_name ? ` от ${parsed.client_name}` : "";
          return { ok: true, message: `Доход ${rub(parsed.amount)}${who} записан`, data: { id: data.id } };
        }),
    },
  },
});