import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Landmark, ChevronLeft, ChevronRight, CalendarIcon, Target, PiggyBank, Calendar as CalIcon, ListChecks } from "lucide-react";
import { startOfMonth, endOfMonth, subMonths, addMonths, format, isSameMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { money } from "@/lib/format";
import { TodayTasks } from "@/components/finance/TodayTasks";
import { TodayCalendarEvents } from "@/components/finance/TodayCalendarEvents";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { HeroBalance } from "@/components/dashboard/HeroBalance";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { HealthCard } from "@/components/dashboard/HealthCard";
import { TopCategories } from "@/components/dashboard/TopCategories";
import { CashflowChart } from "@/components/dashboard/CashflowChart";
import {
  buildCashflow,
  cashflowSummary,
  dayBudget,
  freeUntilEndOfMonth,
  topCategories,
  savingsRate,
  debtLoad,
  monthDelta,
  balanceSparkline,
} from "@/lib/dashboard";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

async function fetchStatic() {
  const [{ data: goals }, { data: debtsSum }] = await Promise.all([
    supabase.from("goals").select("*").eq("is_archived", false).limit(10),
    supabase.from("debts_summary" as any).select("*").maybeSingle(),
  ]);
  return {
    goals: (goals as any[]) ?? [],
    debtsSummary: (debtsSum as any) ?? null,
  };
}

async function fetchMonth(monthStart: Date) {
  const fromISO = startOfMonth(monthStart).toISOString();
  const toISO = endOfMonth(monthStart).toISOString();
  const [{ data: monthExp }, { data: monthInc }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, amount, description, occurred_at, currency, category_id, expense_categories(name, color)")
      .gte("occurred_at", fromISO).lte("occurred_at", toISO)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("incomes" as any)
      .select("id, amount, description, received_at, currency")
      .gte("received_at", fromISO).lte("received_at", toISO)
      .order("received_at", { ascending: false }),
  ]);
  return {
    monthExpenses: (monthExp as any[]) ?? [],
    monthIncomes: (monthInc as any[]) ?? [],
  };
}

async function fetchPrevMonth(monthStart: Date) {
  const prev = startOfMonth(subMonths(monthStart, 1));
  const fromISO = prev.toISOString();
  const toISO = endOfMonth(prev).toISOString();
  const [{ data: e }, { data: i }] = await Promise.all([
    supabase.from("expenses").select("amount").gte("occurred_at", fromISO).lte("occurred_at", toISO),
    supabase.from("incomes" as any).select("amount").gte("received_at", fromISO).lte("received_at", toISO),
  ]);
  const expense = (e ?? []).reduce((s: number, x: any) => s + Number(x.amount), 0);
  const income = (i ?? []).reduce((s: number, x: any) => s + Number(x.amount), 0);
  return { balance: income - expense, expense, income };
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
  const prevQ = useQuery({
    queryKey: ["dashboard", "prev", monthKey],
    queryFn: () => fetchPrevMonth(month),
    staleTime: 60_000,
  });

  const goals = staticQ.data?.goals ?? [];
  const debtsSummary = staticQ.data?.debtsSummary ?? null;
  const monthExpenses = monthQ.data?.monthExpenses ?? [];
  const monthIncomes = monthQ.data?.monthIncomes ?? [];

  const isThisMonth = isSameMonth(month, new Date());
  const monthLabel = format(month, "LLLL yyyy", { locale: ru });

  const cashflow = useMemo(
    () => buildCashflow(month, monthExpenses as any, monthIncomes as any),
    [month, monthExpenses, monthIncomes]
  );
  const summary = useMemo(() => cashflowSummary(cashflow), [cashflow]);
  const expTotal = monthExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const incTotal = monthIncomes.reduce((s: number, i: any) => s + Number(i.amount), 0);
  const balance = incTotal - expTotal;
  const delta = monthDelta(balance, prevQ.data?.balance ?? 0);
  const dayB = dayBudget(month, cashflow);
  const freeRest = freeUntilEndOfMonth(month, cashflow);
  const top = useMemo(() => topCategories(monthExpenses as any, 5), [monthExpenses]);
  const spark = useMemo(() => balanceSparkline(cashflow), [cashflow]);

  const sRate = savingsRate(incTotal, expTotal);
  const dLoad = debtLoad(incTotal, Number(debtsSummary?.total_monthly ?? 0));
  const goalsProgress = useMemo(() => {
    if (!goals.length) return 0;
    const sum = goals.reduce((s: number, g: any) => {
      const p = g.target_amount ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
      return s + p;
    }, 0);
    return Math.round(sum / goals.length);
  }, [goals]);

  return (
    <div>
      {/* Greeting + month switcher */}
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
            Привет, {name}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm capitalize">
            {monthLabel} · командный центр
          </p>
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

      {/* HERO */}
      <HeroBalance
        balance={balance}
        income={incTotal}
        expense={expTotal}
        delta={delta}
        spark={spark}
        dayBudget={dayB}
        freeUntilMonthEnd={freeRest}
        peak={summary.peak ? { date: summary.peak.date, expense: summary.peak.expense } : null}
      />

      {/* Quick actions */}
      <QuickActions />

      {/* Today: tabs on mobile, columns on desktop */}
      <div className="mt-6 sm:mt-8">
        <div className="hidden gap-4 lg:grid lg:grid-cols-2">
          <TodayTasks />
          <TodayCalendarEvents />
        </div>
        <div className="lg:hidden">
          <Tabs defaultValue="tasks">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tasks" className="gap-1.5"><ListChecks size={14}/> Задачи</TabsTrigger>
              <TabsTrigger value="events" className="gap-1.5"><CalIcon size={14}/> События</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="mt-4"><TodayTasks /></TabsContent>
            <TabsContent value="events" className="mt-4"><TodayCalendarEvents /></TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Cashflow */}
      <motion.section
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="mt-6 rounded-3xl border border-border bg-card/60 p-4 backdrop-blur sm:mt-8 sm:p-6"
      >
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Cashflow</h2>
            <p className="text-[11px] text-muted-foreground capitalize">{monthLabel} · по дням</p>
          </div>
          <div className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />Доходы</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" />Расходы</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-primary" />Баланс</span>
          </div>
        </div>
        <CashflowChart data={cashflow} />
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <SummaryStat label="Доход / день" value={money(summary.avgIncome)} tone="success" />
          <SummaryStat label="Расход / день" value={money(summary.avgExpense)} tone="danger" />
          <SummaryStat label="Медиана расхода" value={money(summary.median)} />
          <SummaryStat label="Дней с тратами" value={`${summary.daysWithSpend}`} />
        </div>
      </motion.section>

      {/* Health grid */}
      <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4">
        <HealthCard
          label="Накопления"
          value={`${sRate}%`}
          hint={incTotal > 0 ? `из ${money(incTotal)} дохода` : "нет доходов в месяце"}
          pct={Math.max(0, sRate)}
          tone={sRate >= 20 ? "success" : sRate >= 0 ? "warning" : "danger"}
          to="/incomes"
          icon={<PiggyBank size={12} />}
        />
        <HealthCard
          label="Долговая нагрузка"
          value={`${dLoad}%`}
          hint={debtsSummary ? `платёж ${money(debtsSummary.total_monthly)}/мес` : "кредитов нет"}
          pct={dLoad}
          tone={dLoad <= 20 ? "success" : dLoad <= 40 ? "warning" : "danger"}
          to="/debts"
          icon={<Landmark size={12} />}
        />
        <HealthCard
          label="Цели"
          value={`${goalsProgress}%`}
          hint={goals.length ? `${goals.length} активных` : "целей нет"}
          pct={goalsProgress}
          tone={goalsProgress >= 50 ? "success" : "primary"}
          to="/goals"
          icon={<Target size={12} />}
        />
      </div>

      {/* Top categories + transactions */}
      <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card/60 p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Топ-расходы по категориям</h2>
          <TopCategories items={top} />
        </section>

        <section className="rounded-3xl border border-border bg-card/60 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground capitalize">Транзакции</h2>
            <Link to="/expenses" className="text-xs text-primary hover:underline">все →</Link>
          </div>
          <ul className="divide-y divide-border">
            {[
              ...(monthExpenses.map((e: any) => ({ ...e, kind: "exp" as const, at: e.occurred_at }))),
              ...(monthIncomes.map((i: any) => ({ ...i, kind: "inc" as const, at: i.received_at }))),
            ]
              .sort((a, b) => +new Date(b.at) - +new Date(a.at))
              .slice(0, 8)
              .map((tx: any, idx: number) => (
                <motion.li
                  key={tx.kind + tx.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.03 }}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                        tx.kind === "exp" ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"
                      )}
                    >
                      {tx.kind === "exp" ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm">{tx.description ?? (tx.kind === "exp" ? "Расход" : "Доход")}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(tx.at), "d MMM HH:mm", { locale: ru })}
                        {tx.expense_categories?.name && <span> · {tx.expense_categories.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className={cn("shrink-0 font-mono text-sm tabular-nums sm:text-base", tx.kind === "exp" ? "text-destructive" : "text-success")}>
                    {tx.kind === "exp" ? "−" : "+"}{money(tx.amount, tx.currency)}
                  </div>
                </motion.li>
              ))}
            {!monthExpenses.length && !monthIncomes.length && (
              <li className="py-4 text-sm text-muted-foreground">За этот месяц транзакций нет.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, tone = "default" }: { label: string; value: string; tone?: "success" | "danger" | "default" }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn(
        "mt-1 font-mono text-sm font-semibold tabular-nums",
        tone === "success" && "text-success",
        tone === "danger" && "text-destructive"
      )}>{value}</div>
    </div>
  );
}