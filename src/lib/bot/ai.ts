const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function callAiJSON<T>(args: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  schemaName?: string;
  model?: string;
}): Promise<T> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const name = args.schemaName ?? "extract";
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: args.model ?? "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
      tools: [{ type: "function", function: { name, description: "Return structured data", parameters: args.schema } }],
      tool_choice: { type: "function", function: { name } },
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const raw = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!raw) throw new Error("AI returned no tool call");
  return JSON.parse(raw) as T;
}