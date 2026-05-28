type Point = { date: string; done: number };

export function Sparkline({ data, color = "var(--primary)", height = 36 }: { data: Point[]; color?: string; height?: number }) {
  if (!data.length) return <div style={{ height }} />;
  const w = 120;
  const max = Math.max(1, ...data.map((d) => d.done));
  const step = w / Math.max(1, data.length - 1);
  const pts = data.map((d, i) => [i * step, height - (d.done / max) * (height - 4) - 2] as const);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L${w} ${height} L0 ${height} Z`;
  const gid = `spark-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}