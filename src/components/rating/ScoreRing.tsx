import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ScoreRing({
  score,
  size = 200,
  stroke = 14,
  tone = "default",
  label,
}: {
  score: number;
  size?: number;
  stroke?: number;
  tone?: "success" | "danger" | "default";
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  const colorVar =
    tone === "success" ? "var(--success)" : tone === "danger" ? "var(--destructive)" : "var(--primary)";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colorVar} stopOpacity="1" />
            <stop offset="100%" stopColor={colorVar} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--muted)" strokeWidth={stroke} fill="none" opacity={0.4} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className={cn(
            "font-mono text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl",
            tone === "success" && "text-success",
            tone === "danger" && "text-destructive"
          )}
        >
          {score}
        </motion.div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label ?? "из 100"}</div>
      </div>
    </div>
  );
}