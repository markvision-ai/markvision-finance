import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { botHandler } from "@/lib/bot/handler";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveEntity } from "@/lib/bot/resolve";

const Schema = z.object({
  task_hint: z.string().max(500).optional(),
  task_id: z.string().uuid().optional(),
  new_starts_at: z.string().datetime(),
  new_ends_at: z.string().datetime().optional(),
});

export const Route = createFileRoute("/api/public/bot/reschedule-task")({
  server: {
    handlers: {
      POST: ({ request }) =>
        botHandler(request, async ({ userId, body }) => {
          const p = Schema.parse(body);
          let taskId = p.task_id ?? null;
          if (!taskId) {
            const r = await resolveEntity({ userId, kind: "task", text: p.task_hint ?? "" });
            if (!r.id || r.confidence < 0.5) return { ok: false, message: "Не нашёл задачу." };
            taskId = r.id;
          }
          const { data, error } = await supabaseAdmin.from("tasks").update({ starts_at: p.new_starts_at, ends_at: p.new_ends_at ?? null, updated_at: new Date().toISOString() }).eq("id", taskId).eq("user_id", userId).select("title").single();
          if (error) throw new Error(error.message);
          const d = new Date(p.new_starts_at);
          return { ok: true, message: `«${data.title}» перенесена на ${d.toLocaleString("ru-RU")}` };
        }),
    },
  },
});