import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callAiJSON } from "./ai";

type Entity = { id: string; name: string; description?: string | null };

async function fetchEntities(userId: string, kind: "debt" | "goal" | "task"): Promise<Entity[]> {
  if (kind === "debt") {
    const { data } = await supabaseAdmin.from("debts").select("id, name, description").eq("user_id", userId).eq("is_closed", false).limit(50);
    return (data ?? []) as Entity[];
  }
  if (kind === "goal") {
    const { data } = await supabaseAdmin.from("goals").select("id, name, description").eq("user_id", userId).eq("is_archived", false).limit(50);
    return (data ?? []) as Entity[];
  }
  const { data } = await supabaseAdmin.from("tasks").select("id, title, description").eq("user_id", userId).neq("status", "done").order("created_at", { ascending: false }).limit(50);
  return (data ?? []).map((t: { id: string; title: string; description: string | null }) => ({ id: t.id, name: t.title, description: t.description }));
}

export async function resolveEntity(args: { userId: string; kind: "debt" | "goal" | "task"; text: string }): Promise<{ id: string | null; confidence: number; reason?: string }> {
  const list = await fetchEntities(args.userId, args.kind);
  if (list.length === 0) return { id: null, confidence: 0, reason: "no_entities" };
  if (list.length === 1) return { id: list[0].id, confidence: 0.9 };
  const label = { debt: "кредит/долг", goal: "цель/накопление", task: "задача" }[args.kind];
  return await callAiJSON<{ id: string | null; confidence: number; reason?: string }>({
    system: `Сопоставь запрос с записью (${label}). Верни id из списка или null. confidence 0..1.`,
    user: `Запрос: "${args.text}"\n\nСписок:\n${list.map((e) => `- id=${e.id} name="${e.name}"${e.description ? ` desc="${e.description}"` : ""}`).join("\n")}`,
    schemaName: "resolve_entity",
    schema: { type: "object", properties: { id: { type: ["string", "null"] }, confidence: { type: "number" }, reason: { type: "string" } }, required: ["id", "confidence"], additionalProperties: false },
  });
}