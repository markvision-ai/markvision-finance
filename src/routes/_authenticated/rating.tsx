import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Trophy, CheckCircle2, XCircle, Clock, AlertTriangle, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/finance/PageHeader";
import { StatCard } from "@/components/finance/StatCard";
import { EmptyState } from "@/components/finance/EmptyState";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/rating")({ component: RatingPage });

function RatingPage() {
  const { data: tasks = [] } = useQuery({
    queryKey: ["task-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, status, starts_at, updated_at, created_at")
        .limit(2000);
      return (data as any[]) ?? [];
    },
    staleTime: 30_000,
  });

  const s = useMemo(() => {
    const now = new Date();
    const total = tasks.length;
    let done = 0, cancelled = 0, pending = 0, overdue = 0, onTime = 0, late = 0;
    let lateDaysTotal = 0;
    for (const t of tasks) {
      if (t.status === "done") {
        done++;
        if (t.starts_at) {
          const due = new Date(t.starts_at);
          const finished = new Date(t.updated_at ?? t.created_at);
          if (finished.getTime() <= due.getTime() + 24 * 3600 * 1000) onTime++;
          else {
            late++;
            lateDaysTotal += Math.max(1, Math.floor((finished.getTime() - due.getTime()) / 86_400_000));
          }
        } else {
          onTime++;
        }
      } else if (t.status === "cancelled") {
        cancelled++;
      } else {
        pending++;
        if (t.starts_at && new Date(t.starts_at) < now) overdue++;
      }
    }
    // Score: 100 if you do everything on time, drops for late/cancelled/overdue
    const base = onTime * 1 + late * 0.6 - cancelled * 0.4 - overdue * 0.6;
    const score = total === 0 ? 0 : Math.max(0, Math.min(100, Math.round((base / total) * 100)));
    const completionRate = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, cancelled, pending, overdue, onTime, late, lateDaysTotal, score, completionRate };
  }, [tasks]);

  const level = s.score >= 90 ? "Эталон" : s.score >= 75 ? "Огонь" : s.score >= 50 ? "В строю" : s.score >= 25 ? "Подтягивайся" : "Старт";
  const tone = s.score >= 75 ? "success" : s.score >= 50 ? undefined : "danger";

  return (
    <div>
      <PageHeader title="Рейтинг" subtitle="Как ты справляешься с задачами" />

      {tasks.length === 0 ? (
        <EmptyState title="Пока пусто" description="Создай задачи — здесь появится твоя статистика." />
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card/60 p-6">
            <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
              <Trophy size={14} /> Рейтинг
            </div>
            <div className={cn("mt-2 font-mono text-5xl font-semibold tabular-nums",
              tone === "success" && "text-success",
              tone === "danger" && "text-destructive")}>
              {s.score}
              <span className="ml-2 text-xl text-muted-foreground">/100</span>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{level} · выполнено {s.completionRate}%</div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full",
                tone === "success" ? "bg-success" : tone === "danger" ? "bg-destructive" : "bg-primary")}
                style={{ width: `${s.score}%` }} />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <StatCard label="Всего задач" value={s.total} />
            <StatCard label="Выполнено" value={s.done} tone="success" icon={<CheckCircle2 size={14} className="text-success" />} />
            <StatCard label="Отменено" value={s.cancelled} icon={<XCircle size={14} className="text-muted-foreground" />} />
            <StatCard label="В работе" value={s.pending} icon={<Clock size={14} className="text-primary" />} />
            <StatCard label="Просрочено сейчас" value={s.overdue} tone={s.overdue > 0 ? "danger" : undefined} icon={<AlertTriangle size={14} />} />
            <StatCard label="Вовремя" value={s.onTime} icon={<Flame size={14} className="text-primary" />} />
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card/60 p-5">
            <div className="text-sm font-medium">Дисциплина</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Row label="Выполнено вовремя" value={s.onTime} total={Math.max(1, s.done)} tone="success" />
              <Row label="Выполнено с опозданием" value={s.late} total={Math.max(1, s.done)} tone="danger" />
            </div>
            {s.late > 0 && (
              <div className="mt-3 text-xs text-muted-foreground">
                Суммарное опоздание: {s.lateDaysTotal} дн.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, total, tone }: { label: string; value: number; total: number; tone?: "success" | "danger" }) {
  const pct = Math.round((value / total) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{value} · {pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full",
          tone === "success" ? "bg-success" : tone === "danger" ? "bg-destructive" : "bg-primary")}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}