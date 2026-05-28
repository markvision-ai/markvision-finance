import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, ChevronRight, ListTodo, AlertCircle } from "lucide-react";
import { format, startOfDay, endOfDay, addDays, endOfWeek, isBefore, isAfter } from "date-fns";
import { ru } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Filter = "overdue" | "today" | "tomorrow" | "week" | "nodate";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "today", label: "Сегодня" },
  { key: "tomorrow", label: "Завтра" },
  { key: "week", label: "Эта неделя" },
  { key: "overdue", label: "Просрочено" },
  { key: "nodate", label: "Без даты" },
];

export function TodayTasks() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("today");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", "dashboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, starts_at, status")
        .neq("status", "done")
        .order("starts_at", { ascending: true, nullsFirst: false })
        .limit(50);
      return (data as any[]) ?? [];
    },
    staleTime: 30_000,
  });

  const toggle = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("tasks").update({ status: "done" }).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["tasks", "dashboard"] });
    },
  });

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const tomorrowStart = startOfDay(addDays(now, 1));
  const tomorrowEnd = endOfDay(addDays(now, 1));
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { today: 0, tomorrow: 0, week: 0, overdue: 0, nodate: 0 };
    for (const t of tasks) {
      if (!t.starts_at) { c.nodate++; continue; }
      const d = new Date(t.starts_at);
      if (isBefore(d, todayStart)) c.overdue++;
      else if (d >= todayStart && d <= todayEnd) c.today++;
      else if (d >= tomorrowStart && d <= tomorrowEnd) c.tomorrow++;
      if (d >= todayStart && d <= weekEnd) c.week++;
    }
    return c;
  }, [tasks, todayStart.getTime()]);

  const filtered = useMemo(() => {
    return tasks.filter((t: any) => {
      if (filter === "nodate") return !t.starts_at;
      if (!t.starts_at) return false;
      const d = new Date(t.starts_at);
      if (filter === "overdue") return isBefore(d, todayStart);
      if (filter === "today") return d >= todayStart && d <= todayEnd;
      if (filter === "tomorrow") return d >= tomorrowStart && d <= tomorrowEnd;
      if (filter === "week") return d >= todayStart && d <= weekEnd;
      return true;
    });
  }, [tasks, filter, todayStart.getTime()]);

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ListTodo size={16} /> Задачи
        </h2>
        <Link to="/tasks" className="flex items-center gap-1 text-xs text-primary hover:underline">
          Все <ChevronRight size={12} />
        </Link>
      </div>

      <div className="mb-3 grid grid-cols-4 gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const n = counts[f.key];
          const isOverdue = f.key === "overdue" && n > 0;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex min-w-0 items-center justify-center gap-1 rounded-full border px-2 py-1.5 text-[11px] leading-none transition-colors sm:text-xs",
                active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-background/40 text-muted-foreground hover:text-foreground",
                isOverdue && !active && "border-destructive/40 text-destructive"
              )}
            >
              <span className="truncate">{f.label}</span>
              {n > 0 && (
                <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                  active ? "bg-primary/20" : isOverdue ? "bg-destructive/15" : "bg-muted")}>
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ul className="space-y-1.5">
        {isLoading && <li className="py-3 text-sm text-muted-foreground">Загрузка…</li>}
        {!isLoading && filtered.length === 0 && (
          <li className="py-3 text-sm text-muted-foreground">
            {filter === "today" ? "На сегодня задач нет 🎉" :
             filter === "tomorrow" ? "На завтра пока пусто." :
             filter === "week" ? "На неделю задач нет." :
             filter === "overdue" ? "Нет просроченных задач." : "Пусто."}
          </li>
        )}
        {filtered.slice(0, 6).map((t: any) => {
          const overdue = t.starts_at && isBefore(new Date(t.starts_at), todayStart);
          return (
            <li key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 shrink-0"
                onClick={() => toggle.mutate(t.id)}
                aria-label="Выполнено"
              >
                <Check size={14} />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{t.title}</div>
                {t.starts_at && (
                  <div className={cn("flex items-center gap-1 text-xs",
                    overdue ? "text-destructive" : "text-muted-foreground")}>
                    {overdue && <AlertCircle size={11} />}
                    {format(new Date(t.starts_at), "d MMM, HH:mm", { locale: ru })}
                  </div>
                )}
              </div>
            </li>
          );
        })}
        {filtered.length > 6 && (
          <li>
            <Link to="/tasks" className="block py-2 text-center text-xs text-muted-foreground hover:text-foreground">
              +{filtered.length - 6} ещё
            </Link>
          </li>
        )}
      </ul>
    </section>
  );
}