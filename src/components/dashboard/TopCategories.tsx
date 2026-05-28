import { Link } from "@tanstack/react-router";
import { money } from "@/lib/format";
import type { Category } from "@/lib/dashboard";

export function TopCategories({ items }: { items: Category[] }) {
  const total = items.reduce((s, i) => s + i.amount, 0);
  if (!total) return <p className="text-sm text-muted-foreground">Расходов пока нет.</p>;
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {items.map((c) => (
          <div
            key={c.key}
            style={{
              width: `${(c.amount / total) * 100}%`,
              background: c.color ?? "var(--primary)",
            }}
            className="h-full"
          />
        ))}
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((c) => (
          <li key={c.key}>
            <Link to="/expenses" className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color ?? "var(--primary)" }} />
                <span className="truncate">{c.label}</span>
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                {money(c.amount)} · {Math.round((c.amount / total) * 100)}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}