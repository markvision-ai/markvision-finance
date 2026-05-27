import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { botHandler } from "@/lib/bot/handler";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional().nullable(),
  due_date: z.string().optional().nullable(), // YYYY-MM-DD
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  duration_minutes: z.number().int().positive().max(24 * 60).optional().nullable(),
  is_todo: z.boolean().optional(),
  raw_text: z.string().max(2000).optional(),
});

const GATEWAY_URL =
  "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

async function createGcalEvent(input: {
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  duration_minutes?: number | null;
}): Promise<string | null> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const GCAL_KEY = process.env.GOOGLE_CALENDAR_API_KEY;
  if (!LOVABLE_API_KEY || !GCAL_KEY) return null;
  const start = new Date(input.starts_at);
  const durMin =
    input.duration_minutes && input.duration_minutes > 0
      ? input.duration_minutes
      : 30;
  const end = input.ends_at
    ? new Date(input.ends_at)
    : new Date(start.getTime() + durMin * 60_000);
  const body = {
    summary: input.title,
    description: input.description ?? undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    reminders: { useDefault: true },
  };
  try {
    const res = await fetch(`${GATEWAY_URL}/calendars/primary/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GCAL_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("[bot/task] gcal", res.status, await res.text());
      return null;
    }
    const json = (await res.json()) as { id?: string };
    return json?.id ?? null;
  } catch (e) {
    console.error("[bot/task] gcal error", e);
    return null;
  }
}

export const Route = createFileRoute("/api/public/bot/task")({
  server: {
    handlers: {
      POST: ({ request }) =>
        botHandler(request, async ({ userId, body }) => {
          const parsed = Schema.parse(body);

          // Derive due_date from starts_at if missing
          const dueDate =
            parsed.due_date ??
            (parsed.starts_at
              ? new Date(parsed.starts_at).toISOString().slice(0, 10)
              : null);

          const { data: task, error } = await supabaseAdmin
            .from("tasks")
            .insert({
              user_id: userId,
              title: parsed.title,
              description: parsed.description ?? null,
              due_date: dueDate,
              starts_at: parsed.starts_at ?? null,
              ends_at: parsed.ends_at ?? null,
              duration_minutes: parsed.duration_minutes ?? null,
              is_todo: parsed.is_todo ?? false,
              status: "pending",
              source: "telegram",
              raw_text: parsed.raw_text ?? null,
            })
            .select("id")
            .single();
          if (error) throw new Error(error.message);

          let eventId: string | null = null;
          if (parsed.starts_at) {
            eventId = await createGcalEvent({
              title: parsed.title,
              description: parsed.description,
              starts_at: parsed.starts_at,
              ends_at: parsed.ends_at,
              duration_minutes: parsed.duration_minutes,
            });
            if (eventId) {
              await supabaseAdmin
                .from("tasks")
                .update({ google_event_id: eventId })
                .eq("id", task.id);
            }
          }

          const when = parsed.starts_at
            ? ` на ${new Date(parsed.starts_at).toLocaleString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : dueDate
              ? ` на ${dueDate}`
              : "";
          const cal = eventId ? " + Google Calendar" : "";
          return {
            ok: true,
            message: `Задача «${parsed.title}»${when} добавлена${cal}`,
            data: { id: task.id, google_event_id: eventId },
          };
        }),
    },
  },
});