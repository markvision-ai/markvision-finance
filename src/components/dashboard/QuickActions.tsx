import { Link } from "@tanstack/react-router";
import { TrendingDown, TrendingUp, ListTodo, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { to: "/expenses", label: "Расход", icon: TrendingDown, tone: "destructive" as const },
  { to: "/incomes", label: "Доход", icon: TrendingUp, tone: "success" as const },
  { to: "/tasks", label: "Задача", icon: ListTodo, tone: "primary" as const },
  { to: "/goals", label: "Цель", icon: Target, tone: "primary" as const },
];

export function QuickActions() {
  return (
    <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:mt-5 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        const toneCls =
          a.tone === "destructive" ? "from-destructive/15 to-transparent text-destructive border-destructive/30"
          : a.tone === "success" ? "from-success/15 to-transparent text-success border-success/30"
          : "from-primary/15 to-transparent text-primary border-primary/30";
        return (
          <Link
            key={a.to}
            to={a.to}
            className={cn(
              "group flex shrink-0 items-center gap-2 rounded-2xl border bg-gradient-to-br px-4 py-3 text-sm font-medium transition-all hover:scale-[1.02] sm:shrink",
              toneCls
            )}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-background/40">
              <Icon size={16} />
            </span>
            <span className="text-foreground">+ {a.label}</span>
          </Link>
        );
      })}
    </div>
  );
}