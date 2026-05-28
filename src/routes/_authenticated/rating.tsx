import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle, ListChecks, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/finance/PageHeader";
import { EmptyState } from "@/components/finance/EmptyState";
import { cn } from "@/lib/utils";
import { computeRatingStats, computeAchievements, type Period, type TaskRow } from "@/lib/rating";
import { ScoreRing } from "@/components/rating/ScoreRing";
import { Sparkline } from "@/components/rating/Sparkline";
import { ActivityHeatmap } from "@/components/rating/ActivityHeatmap";
import { DisciplineBar } from "@/components/rating/DisciplineBar";
import { AchievementBadge } from "@/components/rating/AchievementBadge";

export const Route = createFileRoute("/_authenticated/rating")({ component: RatingPage });

const PERIODS: { id: Period; label: string }[] = [
  { id: "week", label: "Неделя" },
  { id: "month", label: "Месяц" },
  { id: "all", label: "Всё время" },
];

function RatingPage() {
  const [period, setPeriod] = useState<Period>("month");

  const { data: tasks = [] } = useQuery({
    queryKey: ["task-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, status, starts_at, updated_at, created_at")
        .limit(2000);
      return (data as TaskRow[]) ?? [];
    },
    staleTime: 30_000,
  });

  const s = useMemo(() => computeRatingStats(tasks, period), [tasks, period]);
  const achievements = useMemo(() => computeAchievements(tasks, s), [tasks, s]);

  return (
    <div>
      <PageHeader
        title="Рейтинг"
        subtitle="Как ты справляешься с задачами"
        action={
          <div className="inline-flex rounded-full border border-border bg-card/60 p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  period === p.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {tasks.length === 0 ? (
        <EmptyState title="Пока пусто" description="Создай задачи — здесь появится твоя статистика." />
      ) : (
        <>
          {/* HERO */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl border border-border bg-card/60 p-6 sm:p-8"
            style={{
              backgroundImage:
                "radial-gradient(120% 80% at 100% 0%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 60%), radial-gradient(80% 60% at 0% 100%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 60%)",
            }}
          >
            <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="order-2 flex-1 sm:order-1">
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Уровень</div>
                <div className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{s.level}</div>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>выполнено {s.completionRate}%</span>
                  <span>·</span>
                  <TrendBadge value={s.trend} />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Chip icon={<Flame size={12} />} label={`Серия ${s.streak} дн.`} tone={s.streak > 0 ? "primary" : "muted"} />
                  <Chip icon={<CheckCircle2 size={12} />} label={`Вовремя ${s.onTime}`} tone="success" />
                  {s.overdue > 0 && <Chip icon={<AlertTriangle size={12} />} label={`Просрочено ${s.overdue}`} tone="danger" />}
                </div>
              </div>

              <div className="order-1 sm:order-2">
                <ScoreRing score={s.score} tone={s.tone} label={`${s.level}`} />
              </div>

              <div className="order-3 grid w-full grid-cols-2 gap-3 sm:w-auto sm:grid-cols-1">
                <MiniStat label="Лучшая серия" value={`${s.bestStreak} дн.`} icon={<Flame size={14} />} />
                <MiniStat label="Среднее опоздание" value={s.avgLateDays ? `${s.avgLateDays} дн.` : "—"} icon={<AlertTriangle size={14} />} />
              </div>
            </div>
          </motion.section>

          {/* KPI */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Всего задач" value={s.total} icon={<ListChecks size={14} />} data={s.daily} color="var(--primary)" />
            <KpiCard label="Выполнено" value={s.done} icon={<CheckCircle2 size={14} className="text-success" />} data={s.daily} color="var(--success)" />
            <KpiCard label="Просрочено" value={s.overdue} icon={<AlertTriangle size={14} className="text-destructive" />} data={s.daily} color="var(--destructive)" tone={s.overdue > 0 ? "danger" : "default"} />
            <KpiCard label="Вовремя %" value={`${s.done ? Math.round((s.onTime / s.done) * 100) : 0}%`} icon={<Target size={14} />} data={s.daily} color="var(--primary)" />
          </div>

          {/* Activity heatmap */}
          <section className="mt-6 rounded-3xl border border-border bg-card/60 p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Активность</div>
                <div className="text-xs text-muted-foreground">Закрытые задачи за последние 8 недель</div>
              </div>
            </div>
            <ActivityHeatmap data={s.daily} />
          </section>

          {/* Discipline */}
          <section className="mt-6 rounded-3xl border border-border bg-card/60 p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Дисциплина</div>
                <div className="text-xs text-muted-foreground">Структура всех задач за период</div>
              </div>
              {s.lateDaysTotal > 0 && (
                <div className="text-xs text-muted-foreground">
                  Опоздание: <span className="font-mono tabular-nums">{s.lateDaysTotal}</span> дн.
                </div>
              )}
            </div>
            <DisciplineBar mix={s.disciplineMix} />
          </section>

          {/* Achievements */}
          <section className="mt-6 rounded-3xl border border-border bg-card/60 p-5 sm:p-6">
            <div className="mb-4">
              <div className="text-sm font-medium">Достижения</div>
              <div className="text-xs text-muted-foreground">Геймификация: что уже взято, что в работе</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {achievements.map((a) => (
                <AchievementBadge key={a.id} a={a} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0)
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus size={12} /> без изменений
      </span>
    );
  const up = value > 0;
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono tabular-nums", up ? "text-success" : "text-destructive")}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? "+" : ""}
      {value}
    </span>
  );
}

function Chip({ icon, label, tone = "muted" }: { icon: React.ReactNode; label: string; tone?: "primary" | "success" | "danger" | "muted" }) {
  const cls =
    tone === "primary"
      ? "border-primary/40 bg-primary/15 text-foreground"
      : tone === "success"
      ? "border-success/40 bg-success/10 text-success"
      : tone === "danger"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : "border-border bg-muted/40 text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs", cls)}>
      {icon}
      {label}
    </span>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background/40 p-3 backdrop-blur">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-1 font-mono text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  data,
  color,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  data: { date: string; done: number }[];
  color: string;
  tone?: "default" | "danger" | "success";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur"
    >
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <div
        className={cn(
          "mt-2 whitespace-nowrap font-mono text-2xl font-semibold tabular-nums",
          tone === "danger" && "text-destructive",
          tone === "success" && "text-success"
        )}
      >
        {value}
      </div>
      <div className="mt-2 -mx-1">
        <Sparkline data={data.slice(-14)} color={color} />
      </div>
    </motion.div>
  );
}