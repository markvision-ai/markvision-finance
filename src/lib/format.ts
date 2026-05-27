const fmtMoney = (currency = "RUB") =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

export function money(amount: number | string | null | undefined, currency = "RUB") {
  const n = typeof amount === "string" ? Number(amount) : amount ?? 0;
  return fmtMoney(currency).format(n);
}

export function num(amount: number | string | null | undefined) {
  const n = typeof amount === "string" ? Number(amount) : amount ?? 0;
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

export function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}