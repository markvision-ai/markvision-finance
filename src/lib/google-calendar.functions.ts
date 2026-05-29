import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL =
  "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

const DEFAULT_TIMEZONE = "Asia/Almaty";

function getAuthHeaders() {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  const GOOGLE_CALENDAR_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;
  if (!GOOGLE_CALENDAR_API_KEY)
    throw new Error("GOOGLE_CALENDAR_API_KEY is not configured");
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": GOOGLE_CALENDAR_API_KEY,
    "Content-Type": "application/json",
  };
}

async function gcalFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: { ...getAuthHeaders(), ...(init.headers ?? {}) },
  });
  const body = await res.text();
  if (!res.ok) {
    // Idempotent DELETE: treat already-gone/missing as success.
    const method = (init.method ?? "GET").toUpperCase();
    if (method === "DELETE" && (res.status === 404 || res.status === 410)) {
      return null;
    }
    throw new Error(`Google Calendar API [${res.status}]: ${body.slice(0, 400)}`);
  }
  return body ? JSON.parse(body) : null;
}

function toEventBody(input: {
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  duration_minutes?: number | null;
}) {
  const start = new Date(input.starts_at);
  const durMin =
    input.duration_minutes && input.duration_minutes > 0
      ? input.duration_minutes
      : 30;
  const end = input.ends_at
    ? new Date(input.ends_at)
    : new Date(start.getTime() + durMin * 60_000);
  return {
    summary: input.title,
    description: input.description ?? undefined,
    start: { dateTime: start.toISOString(), timeZone: DEFAULT_TIMEZONE },
    end: { dateTime: end.toISOString(), timeZone: DEFAULT_TIMEZONE },
    reminders: { useDefault: true },
  };
}

/** Sync a task (create-or-update) to the user's primary Google Calendar. */
export const syncTaskToCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ taskId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: task, error } = await supabase
      .from("tasks")
      .select(
        "id, title, description, starts_at, ends_at, duration_minutes, google_event_id, status",
      )
      .eq("id", data.taskId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!task) return { skipped: true, reason: "task_not_found" };
    if (!task.starts_at) return { skipped: true, reason: "no_date" };

    const body = toEventBody({
      title: task.title,
      description: task.description,
      starts_at: task.starts_at,
      ends_at: task.ends_at,
      duration_minutes: task.duration_minutes,
    });

    let eventId = task.google_event_id ?? null;
    if (eventId) {
      try {
        await gcalFetch(
          `/calendars/primary/events/${encodeURIComponent(eventId)}`,
          { method: "PATCH", body: JSON.stringify(body) },
        );
      } catch (e) {
        // Event might have been deleted in GCal — fall back to create.
        eventId = null;
      }
    }
    if (!eventId) {
      const created = await gcalFetch(`/calendars/primary/events`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      eventId = created?.id ?? null;
      if (eventId) {
        await supabase
          .from("tasks")
          .update({ google_event_id: eventId })
          .eq("id", task.id);
      }
    }
    return { ok: true, eventId };
  });

export const deleteCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ eventId: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    try {
      await gcalFetch(
        `/calendars/primary/events/${encodeURIComponent(data.eventId)}`,
        { method: "DELETE" },
      );
    } catch (e: any) {
      // 404 = not found, 410 = already deleted — both are fine.
      if (!/\b(404|410)\b/.test(String(e?.message ?? ""))) throw e;
    }
    return { ok: true };
  });

export const listTodayEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const params = new URLSearchParams({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "20",
    });
    const json = await gcalFetch(
      `/calendars/primary/events?${params.toString()}`,
    );
    const items: any[] = json?.items ?? [];
    return {
      events: items.map((e) => ({
        id: e.id as string,
        title: (e.summary as string) ?? "(без названия)",
        starts_at: (e.start?.dateTime ?? e.start?.date) as string | undefined,
        ends_at: (e.end?.dateTime ?? e.end?.date) as string | undefined,
        all_day: Boolean(e.start?.date && !e.start?.dateTime),
        html_link: e.htmlLink as string | undefined,
      })),
    };
  });

/** Import today's Google Calendar events as tasks (idempotent by google_event_id). */
export const importEventsAsTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ days: z.number().int().min(1).max(31).default(7) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + data.days);
    const params = new URLSearchParams({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100",
    });
    const json = await gcalFetch(
      `/calendars/primary/events?${params.toString()}`,
    );
    const items: any[] = json?.items ?? [];

    const eventIds = items.map((e) => e.id).filter(Boolean);
    const { data: existing } = await supabase
      .from("tasks")
      .select("google_event_id")
      .in("google_event_id", eventIds.length ? eventIds : ["__none__"]);
    const existingSet = new Set(
      (existing ?? []).map((r: any) => r.google_event_id),
    );

    const toInsert = items
      .filter((e) => !existingSet.has(e.id))
      .map((e) => {
        const startsAt = e.start?.dateTime ?? e.start?.date ?? null;
        const endsAt = e.end?.dateTime ?? e.end?.date ?? null;
        return {
          user_id: userId,
          title: e.summary ?? "(без названия)",
          description: e.description ?? null,
          starts_at: startsAt,
          ends_at: endsAt,
          google_event_id: e.id,
          status: "pending",
          source: "google_calendar",
        };
      });
    if (toInsert.length) {
      const { error } = await supabase.from("tasks").insert(toInsert);
      if (error) throw new Error(error.message);
    }
    return { imported: toInsert.length, skipped: existingSet.size };
  });

/** Create a recurring monthly payment reminder for a debt. */
export const createDebtReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        title: z.string().min(1),
        description: z.string().optional(),
        startDate: z.string(), // YYYY-MM-DD
        recurMonthly: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // All-day event at 09:00 local
    const [y, m, d] = data.startDate.split("-").map(Number);
    const start = new Date(y, (m ?? 1) - 1, d ?? 1, 9, 0, 0);
    const end = new Date(start.getTime() + 30 * 60_000);
    const body: any = {
      summary: data.title,
      description: data.description,
      start: { dateTime: start.toISOString(), timeZone: DEFAULT_TIMEZONE },
      end: { dateTime: end.toISOString(), timeZone: DEFAULT_TIMEZONE },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 24 * 60 },
          { method: "popup", minutes: 60 },
        ],
      },
    };
    if (data.recurMonthly) {
      body.recurrence = ["RRULE:FREQ=MONTHLY"];
    }
    const created = await gcalFetch(`/calendars/primary/events`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { eventId: created?.id as string | undefined };
  });