import { verifyBotSignature } from "./verify-signature";
import { resolveUserId } from "./resolve-user";

export type BotCtx = { userId: string; chatId: number; body: unknown };

export async function botHandler(
  request: Request,
  fn: (ctx: BotCtx) => Promise<{ ok: boolean; message: string; data?: unknown } | Response>,
): Promise<Response> {
  let raw: string;
  try {
    raw = await request.text();
    verifyBotSignature(request, raw);
  } catch (e) {
    if (e instanceof Response) return e;
    return new Response("Bad request", { status: 400 });
  }
  let body: { chat_id?: number } & Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }
  const chatId = Number(body.chat_id);
  if (!Number.isFinite(chatId)) return Response.json({ ok: false, message: "chat_id required" }, { status: 400 });

  let userId: string;
  try {
    userId = await resolveUserId(chatId);
  } catch (e) {
    if (e instanceof Response) return Response.json({ ok: false, message: "Чат не привязан к пользователю" }, { status: 404 });
    throw e;
  }

  try {
    const out = await fn({ userId, chatId, body });
    if (out instanceof Response) return out;
    return Response.json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    console.error("[bot]", msg);
    return Response.json({ ok: false, message: msg }, { status: 500 });
  }
}