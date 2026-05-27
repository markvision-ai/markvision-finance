import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { botHandler } from "@/lib/bot/handler";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveEntity } from "@/lib/bot/resolve";

const Schema = z.object({ task_hint: z.string().max(500).optional(), task_id: z.string().uuid().optional() });

export const Route = createFileRoute("/api/public/bot/close-task")({
  server: {
    handlers: {
      POST: ({ request }) =>
        botHandler(request, async ({ userId, body }) => {
          const p = Schema.parse(body);
          let taskId = p.task_id ?? null;
          if (!taskId) {
            const r = await resolveEntity({ userId, kind: "task", text: p.task_hint ?? "" });
            if (!r.id || r.confidence < 0.5) return { ok: false, message: "Не нашёл задачу. Уточни название." };
            taskId = r.id;
          }
          const { data, error } = await supabaseAdmin.from("tasks").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", taskId).eq("user_id", userId).select("title").single();
          if (error) throw new Error(error.message);
          return { ok: true, message: `Готово: «${data.title}» закрыта` };
        }),
    },
  },
});