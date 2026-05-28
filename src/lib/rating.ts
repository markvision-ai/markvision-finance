export type TaskRow = {
  id: string;
  status: string;
  starts_at: string | null;
  updated_at: string | null;
  created_at: string | null;
};

export type Period = "week" | "month" | "all";

export type RatingStats = {
  total: number;
  done: number;
  cancelled: number;
  pending: number;
  overdue: number;
  onTime: number;
  late: number;
  lateDaysTotal: number;
  avgLateDays: number;
  score: number;
  completionRate: number;
  level: string;
  tone: "success" | "danger" | "default";
  streak: number;
  bestStreak: number;
  trend: number; // delta vs previous period
  daily: { date: string; done: number }[]; // last 56 days
  disciplineMix: { onTime: number; late: number; cancelled: number; overdue: number };
};

const DAY = 86_400_000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function filterByPeriod(tasks: TaskRow[], period: Period): TaskRow[] {
  if (period === "all") return tasks;
  const days = period === "week" ? 7 : 30;
  const cutoff = Date.now() - days * DAY;
  return tasks.filter((t) => {
    const ref = new Date(t.updated_at ?? t.created_at ?? 0).getTime();
    return ref >= cutoff;
  });
}

function rawScore(tasks: TaskRow[]): { score: number; parts: RatingStats } {
  const now = new Date();
  let done = 0, cancelled = 0, pending = 0, overdue = 0, onTime = 0, late = 0, lateDaysTotal = 0;
  for (const t of tasks) {
    if (t.status === "done") {
      done++;
      if (t.starts_at) {
        const due = new Date(t.starts_at);
        const finished = new Date(t.updated_at ?? t.created_at ?? Date.now());
        if (finished.getTime() <= due.getTime() + DAY) onTime++;
        else {
          late++;
          lateDaysTotal += Math.max(1, Math.floor((finished.getTime() - due.getTime()) / DAY));
        }
      } else onTime++;
    } else if (t.status === "cancelled") cancelled++;
    else {
      pending++;
      if (t.starts_at && new Date(t.starts_at) < now) overdue++;
    }
  }
  const total = tasks.length;
  const base = onTime * 1 + late * 0.6 - cancelled * 0.4 - overdue * 0.6;
  const score = total === 0 ? 0 : Math.max(0, Math.min(100, Math.round((base / total) * 100)));
  const completionRate = total === 0 ? 0 : Math.round((done / total) * 100);
  const avgLateDays = late ? Math.round((lateDaysTotal / late) * 10) / 10 : 0;
  return {
    score,
    parts: {
      total, done, cancelled, pending, overdue, onTime, late, lateDaysTotal, avgLateDays,
      score, completionRate,
      level: "", tone: "default",
      streak: 0, bestStreak: 0, trend: 0,
      daily: [],
      disciplineMix: { onTime, late, cancelled, overdue },
    },
  };
}

function computeStreaks(tasks: TaskRow[]): { streak: number; bestStreak: number } {
  const today = startOfDay(new Date()).getTime();
  // Set of day timestamps where at least one task was completed
  const doneDays = new Set<number>();
  // Set of day timestamps where any task became overdue (had due date < day and not done)
  const overdueDays = new Set<number>();
  for (const t of tasks) {
    if (t.status === "done" && (t.updated_at || t.created_at)) {
      doneDays.add(startOfDay(new Date(t.updated_at ?? t.created_at!)).getTime());
    }
    if (t.status !== "done" && t.status !== "cancelled" && t.starts_at) {
      const due = startOfDay(new Date(t.starts_at)).getTime();
      if (due < today) overdueDays.add(due);
    }
  }
  // Current streak: walking back from today while day has done and not overdue
  let streak = 0;
  for (let d = today; ; d -= DAY) {
    if (doneDays.has(d) && !overdueDays.has(d)) streak++;
    else break;
  }
  // Best streak over last 180 days
  let best = 0, cur = 0;
  for (let i = 0; i < 180; i++) {
    const d = today - i * DAY;
    if (doneDays.has(d) && !overdueDays.has(d)) { cur++; best = Math.max(best, cur); }
    else cur = 0;
  }
  return { streak, bestStreak: Math.max(best, streak) };
}

function computeDaily(tasks: TaskRow[], days = 56): { date: string; done: number }[] {
  const today = startOfDay(new Date()).getTime();
  const map = new Map<number, number>();
  for (let i = 0; i < days; i++) map.set(today - i * DAY, 0);
  for (const t of tasks) {
    if (t.status !== "done") continue;
    const ts = startOfDay(new Date(t.updated_at ?? t.created_at ?? 0)).getTime();
    if (map.has(ts)) map.set(ts, (map.get(ts) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([t, done]) => ({ date: new Date(t).toISOString().slice(0, 10), done }));
}

export function computeRatingStats(allTasks: TaskRow[], period: Period): RatingStats {
  const tasks = filterByPeriod(allTasks, period);
  const { parts } = rawScore(tasks);
  const { streak, bestStreak } = computeStreaks(allTasks);
  const daily = computeDaily(allTasks, 56);

  // Trend: compare to previous equal-length window
  let trend = 0;
  if (period !== "all") {
    const days = period === "week" ? 7 : 30;
    const now = Date.now();
    const prev = allTasks.filter((t) => {
      const ref = new Date(t.updated_at ?? t.created_at ?? 0).getTime();
      return ref >= now - 2 * days * DAY && ref < now - days * DAY;
    });
    trend = parts.score - rawScore(prev).score;
  }

  // Streak bonus
  let score = parts.score + Math.min(10, Math.floor(streak / 2));
  // Penalty for long-hanging overdue
  const longOverdue = allTasks.filter((t) =>
    t.status !== "done" && t.status !== "cancelled" && t.starts_at &&
    Date.now() - new Date(t.starts_at).getTime() > 7 * DAY
  ).length;
  score -= longOverdue * 2;
  score = Math.max(0, Math.min(100, score));

  const level = score >= 90 ? "Эталон" : score >= 75 ? "Огонь" : score >= 50 ? "В строю" : score >= 25 ? "Подтягивайся" : "Старт";
  const tone: RatingStats["tone"] = score >= 75 ? "success" : score >= 50 ? "default" : "danger";

  return { ...parts, score, level, tone, streak, bestStreak, trend, daily };
}

export type Achievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number; // 0..1
  current: number;
  target: number;
};

export function computeAchievements(allTasks: TaskRow[], stats: RatingStats): Achievement[] {
  const doneTotal = allTasks.filter((t) => t.status === "done").length;
  // Max done in a single day (last 56 days)
  const peakDay = stats.daily.reduce((m, d) => Math.max(m, d.done), 0);
  const list: Omit<Achievement, "unlocked" | "progress">[] = [
    { id: "first10", title: "Первые 10", description: "Закрой 10 задач", current: doneTotal, target: 10 },
    { id: "first100", title: "Сотка", description: "Закрой 100 задач", current: doneTotal, target: 100 },
    { id: "streak7", title: "Неделя огня", description: "7 дней серии", current: stats.streak, target: 7 },
    { id: "streak30", title: "Месяц-машина", description: "30 дней серии", current: stats.bestStreak, target: 30 },
    { id: "peak10", title: "Дневной марафон", description: "10 задач за день", current: peakDay, target: 10 },
    { id: "score90", title: "Эталон", description: "Рейтинг 90+", current: stats.score, target: 90 },
  ];
  return list.map((a) => ({
    ...a,
    unlocked: a.current >= a.target,
    progress: Math.min(1, a.current / a.target),
  }));
}