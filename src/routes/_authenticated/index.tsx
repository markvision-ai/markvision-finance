import { createFileRoute } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, Landmark, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { startOfMonth, endOfMonth, subMonths, addMonths, format, isSameMonth } from "date-fns";
import { ru } from "date-fns/locale";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { StatCard } from "@/components/finance/StatCard";
import { money } from "@/lib/format";
import { TodayTasks } from "@/components/finance/TodayTasks";
import { TodayCalendarEvents } from "@/components/finance/TodayCalendarEvents";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

async function fetchStatic() {
  const twelveMonthsAgo = subMonths(startOfMonth(new Date()), 11).toISOString();
  const [{ data: mb }, { data: goals }, { data: debtsSum }] = await Promise.all([
    supabase.from("monthly_balance" as any).select("*").gte("month", twelveMonthsAgo).order("month"),
    supabase.from("goals").select("*").eq("is_archived", false).limit(10),
    supabase.from("debts_summary" as any).select("*").maybeSingle(),
  ]);
  return {
    monthlyBalance: (mb as any[]) ?? [],
    goals: (goals as any[]) ?? [],
    debtsSummary: (debtsSum as any) ?? null,
  };
}

async function fetchMonth(monthStart: Date) {
  const fromISO = startOfMonth(monthStart).toISOString();
  const toISO = endOfMonth(monthStart).toISOString();
  const [{ data: monthExp }, { data: monthInc }] = await Promise.all([
    supabase.from("expenses").select("id, amount, description, occurred_at, currency").gte("occurred_at", fromISO).lte("occurred_at", toISO).order("occurred_at", { ascending: false }),
    supabase.from("incomes" as any).select("id, amount, description, received_at, currency").gte("received_at", fromISO).lte("received_at", toISO).order("received_at", { ascending: false }),
  ]);
  return {
    monthExpenses: (monthExp as any[]) ?? [],
    monthIncomes: (monthInc as any[]) ?? [],
  };
}

function Dashboard() {
  const { user } = useAuth();
  const name =
    (user?.user_metadata as any)?.display_name?.trim() ||
    user?.email?.split("@")[0] ||
    "друг";
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const monthKey = format(month, "yyyy-MM");
  const staticQ = useQuery({
    queryKey: ["dashboard", "static"],
    queryFn: fetchStatic,
    staleTime: 60_000,
  });
  const monthQ = useQuery({
    queryKey: ["dashboard", "month", monthKey],
    queryFn: () => fetchMonth(month),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const data = {
    monthlyBalance: staticQ.data?.monthlyBalance ?? [],
    goals: staticQ.data?.goals ?? [],
    debtsSummary: staticQ.data?.debtsSummary ?? null,
    monthExpenses: monthQ.data?.monthExpenses ?? [],
    monthIncomes: monthQ.data?.monthIncomes ?? [],
  };
  const isLoading = staticQ.isLoading || (monthQ.isLoading && !monthQ.data);

  const chartData = useMemo(() => {
    return (data?.monthlyBalance ?? []).map((r: any) => ({
      month: format(new Date(r.month), "LLL", { locale: ru }),
      _date: new Date(r.month),
      Доходы: Number(r.income_total),
      Расходы: Number(r.expense_total),
      Баланс: Number(r.balance),
    }));
  }, [data]);

  const expTotal = data.monthExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const incTotal = data.monthIncomes.reduce((s: number, i: any) => s + Number(i.amount), 0);
  const balance = incTotal - expTotal;
  const isThisMonth = isSameMonth(month, new Date());
  const monthLabel = format(month, "LLLL yyyy", { locale: ru });

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">Привет, {name}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">Финансовая статистика за выбранный месяц</p>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setMonth((m) => startOfMonth(subMonths(m, 1)))}>
            <ChevronLeft size={16} />
          </Button>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 min-w-[150px] justify-center px-3 capitalize">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {monthLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={month}
                onSelect={(d) => { if (d) { setMonth(startOfMonth(d)); setPickerOpen(false); } }}
                locale={ru}
                captionLayout="dropdown"
                defaultMonth={month}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => setMonth((m) => startOfMonth(addMonths(m, 1)))}
            disabled={isThisMonth}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3"
      >
        <StatCard
          label="Баланс"
          value={isLoading ? "—" : money(balance)}
          tone={balance >= 0 ? "success" : "danger"}
          hint={isThisMonth ? "текущий месяц" : monthLabel}
          icon={<Wallet size={18} />}
        />
        <StatCard
          label="Расходы"
          value={isLoading ? "—" : money(expTotal)}
          tone="danger"
          icon={<TrendingDown size={18} />}
        />
        <div className="col-span-2 md:col-span-1">
          <StatCard
            label="Доходы"
            value={isLoading ? "—" : money(incTotal)}
            tone="success"
            icon={<TrendingUp size={18} />}
          />
        </div>
      </motion.div>

      <div className="mt-6 grid gap-4 sm:mt-8 lg:grid-cols-2">
        <TodayTasks />
        <TodayCalendarEvents />
      </div>

      <section className="relative mt-6 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-card/40 p-4 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)] backdrop-blur sm:mt-8 sm:p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[oklch(0.62_0.20_277)/0.08] blur-3xl" />
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Cashflow</h2>
            <p className="text-[11px] text-muted-foreground">Последние 12 месяцев</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[oklch(0.70_0.17_155)]" />Доходы
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[oklch(0.62_0.22_25)]" />Расходы
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full bg-[oklch(0.62_0.20_277)]" />Баланс
            </span>
          </div>
        </div>
        <div className="h-60 w-full sm:h-72">
          <ResponsiveContainer>
            <ComposedChart data={chartData} margin={{ left: -12, right: 8, top: 12, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.18 155)" stopOpacity={1} />
                  <stop offset="100%" stopColor="oklch(0.55 0.16 155)" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.70 0.22 25)" stopOpacity={1} />
                  <stop offset="100%" stopColor="oklch(0.50 0.20 25)" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="balanceGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="oklch(0.70 0.20 277)" />
                  <stop offset="100%" stopColor="oklch(0.78 0.18 200)" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(0.30 0.02 270)" strokeDasharray="2 4" opacity={0.4} vertical={false} />
              <XAxis dataKey="month" stroke="oklch(0.60 0.02 270)" fontSize={10} tickLine={false} axisLine={false} dy={6} />
              <YAxis stroke="oklch(0.60 0.02 270)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={40} />
              <Tooltip
                cursor={{ fill: "oklch(0.30 0.02 270 / 0.25)", radius: 8 }}
                contentStyle={{
                  background: "oklch(0.16 0.02 270 / 0.95)",
                  border: "1px solid oklch(0.30 0.02 270)",
                  borderRadius: 12,
                  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.6)",
                  fontSize: 12,
                  padding: "8px 12px",
                }}
                labelStyle={{ color: "oklch(0.85 0.02 270)", fontWeight: 600, marginBottom: 4, textTransform: "capitalize" }}
                formatter={(v: any) => money(Number(v))}
              />
              <Bar dataKey="Доходы" fill="url(#incomeGrad)" radius={[8, 8, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Расходы" fill="url(#expenseGrad)" radius={[8, 8, 0, 0]} maxBarSize={28} />
              <Line
                dataKey="Баланс"
                stroke="url(#balanceGrad)"
                strokeWidth={2.5}
                type="monotone"
                dot={{ r: 3, fill: "oklch(0.16 0.02 270)", stroke: "oklch(0.70 0.20 277)", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "oklch(0.70 0.20 277)", stroke: "oklch(0.95 0.02 270)", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Активные цели</h2>
          <div className="space-y-3">
            {(data?.goals ?? []).slice(0, 4).map((g: any) => {
              const p = g.target_amount ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
              return (
                <div key={g.id}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{g.name}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums sm:text-sm">
                      {money(g.current_amount, g.currency)} / {money(g.target_amount, g.currency)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${p}%` }} />
                  </div>
                </div>
              );
            })}
            {!data?.goals?.length && <p className="text-sm text-muted-foreground">Целей пока нет.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Landmark size={16} /> Кредиты
          </h2>
          {data?.debtsSummary ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Активных</div>
                <div className="font-mono text-lg tabular-nums sm:text-xl">{data.debtsSummary.active_count}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Остаток</div>
                <div className="font-mono text-base tabular-nums sm:text-xl">{money(data.debtsSummary.total_remaining)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Платёж/мес</div>
                <div className="font-mono text-base tabular-nums sm:text-xl">{money(data.debtsSummary.total_monthly)}</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Активных кредитов нет.</p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card/60 p-4 sm:mt-8 sm:p-5">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground capitalize">
          Транзакции · {monthLabel}
        </h2>
        <div className="divide-y divide-border">
          {[
            ...((data?.monthExpenses ?? []).map((e: any) => ({ ...e, kind: "exp", at: e.occurred_at }))),
            ...((data?.monthIncomes ?? []).map((i: any) => ({ ...i, kind: "inc", at: i.received_at }))),
          ]
            .sort((a, b) => +new Date(b.at) - +new Date(a.at))
            .slice(0, 8)
            .map((tx: any) => (
              <div key={tx.kind + tx.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {tx.kind === "exp" ? (
                    <TrendingDown size={18} className="shrink-0 text-destructive" />
                  ) : (
                    <TrendingUp size={18} className="shrink-0 text-success" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm">{tx.description ?? (tx.kind === "exp" ? "Расход" : "Доход")}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(tx.at), "d MMM HH:mm", { locale: ru })}
                    </div>
                  </div>
                </div>
                <div className={`shrink-0 font-mono text-sm tabular-nums sm:text-base ${tx.kind === "exp" ? "text-destructive" : "text-success"}`}>
                  {tx.kind === "exp" ? "−" : "+"}
                  {money(tx.amount, tx.currency)}
                </div>
              </div>
            ))}
          {!data?.monthExpenses?.length && !data?.monthIncomes?.length && (
            <p className="py-4 text-sm text-muted-foreground">За этот месяц транзакций нет.</p>
          )}
        </div>
      </section>
    </div>
  );
}