const symbols: Record<string, string> = {
  KZT: "₸",
  RUB: "₽",
  USD: "$",
  EUR: "€",
};

export function money(amount: number | string | null | undefined, currency = "KZT") {
  const n = typeof amount === "string" ? Number(amount) : amount ?? 0;
  const formatted = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 })
    .format(n)
    .replace(/\s/g, "\u202F"); // narrow no-break space between digit groups
  const sym = symbols[currency] ?? currency;
  return `${formatted}\u00A0${sym}`;
}

export function num(amount: number | string | null | undefined) {
  const n = typeof amount === "string" ? Number(amount) : amount ?? 0;
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

export function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}