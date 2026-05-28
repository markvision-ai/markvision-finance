type Day = { date: string; done: number };

export function ActivityHeatmap({ data }: { data: Day[] }) {
  // data is chronological, length ~56 (8 weeks * 7)
  const max = Math.max(1, ...data.map((d) => d.done));
  // Build columns of 7 days
  const cols: Day[][] = [];
  for (let i = 0; i < data.length; i += 7) cols.push(data.slice(i, i + 7));
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1.5">
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1.5">
            {col.map((d) => {
              const intensity = d.done === 0 ? 0 : 0.2 + (d.done / max) * 0.8;
              return (
                <div
                  key={d.date}
                  title={`${d.date} · ${d.done} зад.`}
                  className="h-4 w-4 rounded-[4px] border border-border/40 transition-transform hover:scale-110"
                  style={{
                    background: d.done === 0 ? "var(--muted)" : `color-mix(in oklab, var(--primary) ${intensity * 100}%, transparent)`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>меньше</span>
        {[0.15, 0.35, 0.55, 0.8, 1].map((v) => (
          <span key={v} className="h-3 w-3 rounded-[3px]" style={{ background: `color-mix(in oklab, var(--primary) ${v * 100}%, transparent)` }} />
        ))}
        <span>больше</span>
      </div>
    </div>
  );
}