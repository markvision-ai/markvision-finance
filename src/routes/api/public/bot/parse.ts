import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { botHandler } from "@/lib/bot/handler";
import { callAiJSON } from "@/lib/bot/ai";

const Schema = z.object({ text: z.string().min(1).max(2000) });

export const Route = createFileRoute("/api/public/bot/parse")({
  server: {
    handlers: {
      POST: ({ request }) =>
        botHandler(request, async ({ body }) => {
          const { text } = Schema.parse(body);
          const out = await callAiJSON<{ intent: string; payload: Record<string, unknown> }>({
            system:
              "Распарси сообщение пользователя в одно из намерений: expense, income, debt_payment, goal_contribution, create_debt, create_goal, task, todo, close_task, reschedule_task, status_query, cancel, unknown. " +
              "В payload положи распарсенные поля (amount как число в рублях, name, hint, date в ISO и т.д.).",
            user: text,
            schemaName: "parse_message",
            schema: {
              type: "object",
              properties: {
                intent: { type: "string", enum: ["expense", "income", "debt_payment", "goal_contribution", "create_debt", "create_goal", "task", "todo", "close_task", "reschedule_task", "status_query", "cancel", "unknown"] },
                payload: { type: "object", additionalProperties: true },
              },
              required: ["intent", "payload"],
            },
          });
          return { ok: true, message: "parsed", data: out };
        }),
    },
  },
});