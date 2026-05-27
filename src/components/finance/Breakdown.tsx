import { money } from "@/lib/format";

export type BreakdownItem = {
  key: string;
  label: string;
  amount: number;
  color?: string | null;
};

export function Breakdown({
  title,
  items,
  emptyText = "Пока пусто",
  max = 8,
  tone = "primary",
}: {
  title: string;
  items: BreakdownItem[];
  emptyText?: string;
  max?: number;
  tone?: "primary" | "danger" | "success";
}) {
  const sorted = [...items].filter((i) => i.amount > 0).sort((a, b) => b.amount - a.amount);
  const top = sorted.slice(0, max);
  const total = sorted.reduce((s, i) => s + i.amount, 0);
  const peak = top[0]?.amount ?? 0;
  const fallbackColor =
    tone === "danger" ? "oklch(0.62 0.22 25)" : tone === "success" ? "oklch(0.70 0.17 155)" : "oklch(0.62 0.20 277)";

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        {total > 0 && <span className="font-mono text-xs text-muted-foreground tabular-nums">всего {money(total)}</span>}
      </div>
      {top.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {top.map((i) => {
            const pct = total ? (i.amount / total) * 100 : 0;
            const w = peak ? (i.amount / peak) * 100 : 0;
            const color = i.color || fallbackColor;
            return (
              <li key={i.key}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                    <span className="truncate">{i.label}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {money(i.amount)} <span className="ml-1">· {pct.toFixed(0)}%</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(2, w)}%`, background: color }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}