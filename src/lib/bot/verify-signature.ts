import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifies HMAC SHA-256 signature: signature = hex(hmac(secret, `${timestamp}.${body}`))
 * Headers expected: x-bot-signature, x-bot-timestamp.
 * Throws Response(401) on failure.
 */
export function verifyBotSignature(request: Request, rawBody: string): void {
  const secret = process.env.BOT_SHARED_SECRET;
  if (!secret) throw new Response("Server misconfigured", { status: 500 });

  const signature = request.headers.get("x-bot-signature") ?? "";
  const timestamp = request.headers.get("x-bot-timestamp") ?? "";
  if (!signature || !timestamp) throw new Response("Missing signature", { status: 401 });

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) throw new Response("Bad timestamp", { status: 401 });
  const drift = Math.abs(Date.now() / 1000 - ts);
  if (drift > 300) throw new Response("Timestamp out of window", { status: 401 });

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Response("Invalid signature", { status: 401 });
  }
}

export function verifyCronAuth(request: Request): void {
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const key = request.headers.get("apikey") ?? "";
  if (!anon || key !== anon) throw new Response("Unauthorized", { status: 401 });
}