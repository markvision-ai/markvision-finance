import { Lock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Achievement } from "@/lib/rating";

export function AchievementBadge({ a }: { a: Achievement }) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 transition-all",
        a.unlocked
          ? "border-primary/40 bg-gradient-to-br from-primary/15 to-transparent"
          : "border-border bg-card/40 opacity-80"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-sm font-medium">{a.title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{a.description}</div>
        </div>
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            a.unlocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {a.unlocked ? <Check size={14} /> : <Lock size={12} />}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", a.unlocked ? "bg-primary" : "bg-muted-foreground/50")}
          style={{ width: `${Math.max(4, a.progress * 100)}%` }}
        />
      </div>
      <div className="mt-1.5 text-right text-[11px] font-mono tabular-nums text-muted-foreground">
        {Math.min(a.current, a.target)} / {a.target}
      </div>
    </div>
  );
}