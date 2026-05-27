/**
 * Parses "1.8млн", "30к", "25 000", "25000₽" → number (RUB).
 */
export function parseAmount(input: string): number | null {
  if (!input) return null;
  const cleaned = input.toLowerCase().replace(/\u00a0/g, " ").replace(/[₽$€]/g, "");
  const re = /(\d+(?:[.,]\d+)?)\s*(млн|млрд|тыс|к|m|kk|k|b)?/i;
  const m = cleaned.match(re);
  if (!m) return null;
  let n = parseFloat(m[1].replace(",", "."));
  const suffix = (m[2] || "").toLowerCase();
  if (suffix === "млрд" || suffix === "b") n *= 1_000_000_000;
  else if (suffix === "млн" || suffix === "m" || suffix === "kk") n *= 1_000_000;
  else if (suffix === "тыс" || suffix === "к" || suffix === "k") n *= 1_000;
  return Math.round(n * 100) / 100;
}