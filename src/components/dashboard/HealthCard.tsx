import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function HealthCard({
  label,
  value,
  hint,
  pct,
  tone,
  to,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  pct: number; // 0..100 for the bar
  tone: "success" | "warning" | "danger" | "primary";
  to: string;
  icon?: React.ReactNode;
}) {
  const colorVar =
    tone === "success" ? "var(--success)"
    : tone === "warning" ? "var(--warning)"
    : tone === "danger" ? "var(--destructive)"
    : "var(--primary)";
  return (
    <Link to={to} className="group block">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur transition-all group-hover:border-primary/40"
      >
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5">{icon} {label}</span>
          <ChevronRight size={14} className="opacity-40 transition-opacity group-hover:opacity-100" />
        </div>
        <div className={cn("mt-2 font-mono text-2xl font-semibold tabular-nums")} style={{ color: colorVar }}>
          {value}
        </div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full"
            style={{ background: colorVar }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </motion.div>
    </Link>
  );
}