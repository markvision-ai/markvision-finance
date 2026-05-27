import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

async function fetchDashboard(monthStart: Date) {
  const twelveMonthsAgo = subMonths(startOfMonth(new Date()), 11).toISOString();
  const fromISO = startOfMonth(monthStart).toISOString();
  const toISO = endOfMonth(monthStart).toISOString();
  const [{ data: mb }, { data: monthExp }, { data: monthInc }, { data: goals }, { data: debtsSum }] =
    await Promise.all([
      supabase.from("monthly_balance" as any).select("*").gte("month", twelveMonthsAgo).order("month"),
      supabase.from("expenses").select("id, amount, description, occurred_at, currency").gte("occurred_at", fromISO).lte("occurred_at", toISO).order("occurred_at", { ascending: false }),
      supabase.from("incomes" as any).select("id, amount, description, received_at, currency").gte("received_at", fromISO).lte("received_at", toISO).order("received_at", { ascending: false }),
      supabase.from("goals").select("*").eq("is_archived", false).limit(10),
      supabase.from("debts_summary" as any).select("*").maybeSingle(),
    ]);
  return {
    monthlyBalance: (mb as any[]) ?? [],
    monthExpenses: (monthExp as any[]) ?? [],
    monthIncomes: (monthInc as any[]) ?? [],
    goals: (goals as any[]) ?? [],
    debtsSummary: (debtsSum as any) ?? null,
  };
}

function Dashboard() {
  const { user } = useAuth();
  const name = user?.email?.split("@")[0] ?? "друг";
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const monthKey = format(month, "yyyy-MM");
  const { data, isLoading } = useQuery({ queryKey: ["dashboard", monthKey], queryFn: () => fetchDashboard(month) });

  const chartData = useMemo(() => {
    return (data?.monthlyBalance ?? []).map((r: any) => ({
      month: format(new Date(r.month), "LLL", { locale: ru }),
      _date: new Date(r.month),
      Доходы: Number(r.income_total),
      Расходы: Number(r.expense_total),
      Баланс: Number(r.balance),
    }));
  }, [data]);

  const expTotal = (data?.monthExpenses ?? []).reduce((s, e: any) => s + Number(e.amount), 0);
  const incTotal = (data?.monthIncomes ?? []).reduce((s, i: any) => s + Number(i.amount), 0);
  const balance = incTotal - expTotal;
  const isThisMonth = isSameMonth(month, new Date());
  const monthLabel = format(month, "LLLL yyyy", { locale: ru });

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">Привет, {name}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">Финансовый снапшот за выбранный месяц</p>
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

      <section className="mt-6 rounded-2xl border border-border bg-card/60 p-4 sm:mt-8 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Cashflow · 12 месяцев</h2>
        </div>
        <div className="h-60 w-full sm:h-72">
          <ResponsiveContainer>
            <ComposedChart data={chartData} margin={{ left: -16, right: 4, top: 8 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" stroke="oklch(0.68 0.02 270)" fontSize={10} />
              <YAxis stroke="oklch(0.68 0.02 270)" fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip
                contentStyle={{ background: "oklch(0.19 0.02 270)", border: "1px solid oklch(0.27 0.02 270)", borderRadius: 12 }}
                formatter={(v: any) => money(Number(v))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Доходы" fill="oklch(0.70 0.17 155)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Расходы" fill="oklch(0.62 0.22 25)" radius={[6, 6, 0, 0]} />
              <Line dataKey="Баланс" stroke="oklch(0.62 0.20 277)" strokeWidth={2} dot={false} />
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