type Mix = { onTime: number; late: number; cancelled: number; overdue: number };

export function DisciplineBar({ mix }: { mix: Mix }) {
  const total = mix.onTime + mix.late + mix.cancelled + mix.overdue;
  const segs = [
    { key: "onTime", label: "Вовремя", v: mix.onTime, color: "var(--success)" },
    { key: "late", label: "С опозданием", v: mix.late, color: "var(--warning)" },
    { key: "overdue", label: "Просрочено", v: mix.overdue, color: "var(--destructive)" },
    { key: "cancelled", label: "Отменено", v: mix.cancelled, color: "var(--muted-foreground)" },
  ];
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {total === 0 ? null : segs.map((s) => (
          <div key={s.key} style={{ width: `${(s.v / total) * 100}%`, background: s.color }} className="h-full transition-all" />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {segs.map((s) => {
          const pct = total ? Math.round((s.v / total) * 100) : 0;
          return (
            <div key={s.key} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="ml-auto font-mono tabular-nums">{s.v} · {pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}