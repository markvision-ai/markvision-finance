const GATEWAY = "https://connector-gateway.lovable.dev/telegram";

export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const lovable = process.env.LOVABLE_API_KEY;
  const tg = process.env.TELEGRAM_API_KEY;
  if (!lovable || !tg) {
    console.warn("[tg] TELEGRAM_API_KEY not configured");
    return;
  }
  const res = await fetch(`${GATEWAY}/sendMessage`, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": tg, "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  if (!res.ok) console.error(`[tg] ${res.status}: ${await res.text()}`);
}