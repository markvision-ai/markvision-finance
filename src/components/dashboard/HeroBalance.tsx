import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

type Spark = { date: string; value: number };

export function HeroBalance({
  balance,
  income,
  expense,
  delta,
  spark,
  dayBudget,
  freeUntilMonthEnd,
  peak,
}: {
  balance: number;
  income: number;
  expense: number;
  delta: { diff: number; pct: number };
  spark: Spark[];
  dayBudget: { spent: number; limit: number; pct: number };
  freeUntilMonthEnd: { balance: number; remainingDays: number; perDay: number };
  peak: { date: string; expense: number } | null;
}) {
  const positive = balance >= 0;
  const tone = positive ? "var(--success)" : "var(--destructive)";
  const trendUp = delta.diff >= 0;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl border border-border bg-card/60 p-5 sm:p-7"
      style={{
        backgroundImage:
          `radial-gradient(120% 80% at 100% 0%, color-mix(in oklab, ${tone} 18%, transparent), transparent 60%),` +
          `radial-gradient(80% 60% at 0% 100%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 60%)`,
      }}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Баланс месяца</div>
          <div
            className={cn(
              "mt-2 font-mono text-[clamp(2rem,9vw,3.5rem)] font-semibold tabular-nums tracking-tight",
              positive ? "text-success" : "text-destructive"
            )}
          >
            {money(balance)}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            {delta.diff === 0 ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Minus size={12} /> к прошлому месяцу
              </span>
            ) : (
              <span className={cn("inline-flex items-center gap-1 font-mono tabular-nums", trendUp ? "text-success" : "text-destructive")}>
                {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {trendUp ? "+" : ""}{money(delta.diff)}
                <span className="ml-1 text-muted-foreground">({trendUp ? "+" : ""}{delta.pct}% к прошлому)</span>
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Chip label="Доход" value={money(income)} tone="success" />
            <Chip label="Расход" value={money(expense)} tone="danger" />
            {peak && peak.expense > 0 && (
              <Chip label="Пик дня" value={money(peak.expense)} tone="muted" icon={<Sparkles size={11} />} />
            )}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row lg:flex-col lg:w-[260px]">
          <DayBudgetRing pct={dayBudget.pct} spent={dayBudget.spent} limit={dayBudget.limit} />
          <FreeCard free={freeUntilMonthEnd.balance} perDay={freeUntilMonthEnd.perDay} days={freeUntilMonthEnd.remainingDays} />
        </div>
      </div>

      {spark.length > 1 && (
        <div className="-mx-2 mt-5 sm:-mx-3">
          <BalanceSparkline data={spark} positive={positive} />
        </div>
      )}
    </motion.section>
  );
}

function Chip({ label, value, tone, icon }: { label: string; value: string; tone: "success" | "danger" | "muted"; icon?: React.ReactNode }) {
  const cls =
    tone === "success" ? "border-success/40 bg-success/10 text-success"
    : tone === "danger" ? "border-destructive/40 bg-destructive/10 text-destructive"
    : "border-border bg-muted/40 text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs", cls)}>
      {icon}
      <span className="opacity-70">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </span>
  );
}

function DayBudgetRing({ pct, spent, limit }: { pct: number; spent: number; limit: number }) {
  const size = 88, stroke = 8, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const tone = pct < 70 ? "var(--success)" : pct < 100 ? "var(--warning)" : "var(--destructive)";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/40 p-3 backdrop-blur">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} stroke="var(--muted)" strokeWidth={stroke} fill="none" opacity={0.4}/>
          <motion.circle
            cx={size/2} cy={size/2} r={r} stroke={tone} strokeWidth={stroke} strokeLinecap="round" fill="none"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono text-sm font-semibold tabular-nums">{pct}%</div>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Бюджет дня</div>
        <div className="font-mono text-sm tabular-nums">{money(spent)}</div>
        <div className="text-[11px] text-muted-foreground">из {money(limit)}</div>
      </div>
    </div>
  );
}

function FreeCard({ free, perDay, days }: { free: number; perDay: number; days: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background/40 p-3 backdrop-blur">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Свободно до конца месяца</div>
      <div className={cn("mt-1 font-mono text-lg font-semibold tabular-nums", free >= 0 ? "text-foreground" : "text-destructive")}>
        {money(free)}
      </div>
      <div className="text-[11px] text-muted-foreground">
        ≈ {money(perDay)} / день · осталось {days} дн.
      </div>
    </div>
  );
}

function BalanceSparkline({ data, positive }: { data: Spark[]; positive: boolean }) {
  const w = 600, h = 60;
  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const range = max - min || 1;
  const step = w / Math.max(1, data.length - 1);
  const pts = data.map((d, i) => [i * step, h - ((d.value - min) / range) * (h - 6) - 3] as const);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L${w} ${h} L0 ${h} Z`;
  const color = positive ? "var(--success)" : "var(--destructive)";
  const gid = `hero-spark`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height: h }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`}/>
      <path d={path} stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}