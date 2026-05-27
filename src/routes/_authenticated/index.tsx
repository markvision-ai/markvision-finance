import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, Landmark } from "lucide-react";
import { startOfMonth, subMonths, format } from "date-fns";
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
import { PageHeader } from "@/components/finance/PageHeader";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

async function fetchDashboard() {
  const twelveMonthsAgo = subMonths(startOfMonth(new Date()), 11).toISOString();
  const [{ data: mb }, { data: recentExp }, { data: recentInc }, { data: goals }, { data: debtsSum }] =
    await Promise.all([
      supabase.from("monthly_balance" as any).select("*").gte("month", twelveMonthsAgo).order("month"),
      supabase.from("expenses").select("id, amount, description, occurred_at, currency").order("occurred_at", { ascending: false }).limit(5),
      supabase.from("incomes" as any).select("id, amount, description, received_at, currency").order("received_at", { ascending: false }).limit(5),
      supabase.from("goals").select("*").eq("is_archived", false).limit(10),
      supabase.from("debts_summary" as any).select("*").maybeSingle(),
    ]);
  return {
    monthlyBalance: (mb as any[]) ?? [],
    recentExpenses: (recentExp as any[]) ?? [],
    recentIncomes: (recentInc as any[]) ?? [],
    goals: (goals as any[]) ?? [],
    debtsSummary: (debtsSum as any) ?? null,
  };
}

function Dashboard() {
  const { user } = useAuth();
  const name = user?.email?.split("@")[0] ?? "друг";
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });

  const chartData = useMemo(() => {
    return (data?.monthlyBalance ?? []).map((r: any) => ({
      month: format(new Date(r.month), "LLL", { locale: ru }),
      Доходы: Number(r.income_total),
      Расходы: Number(r.expense_total),
      Баланс: Number(r.balance),
    }));
  }, [data]);

  const thisMonth = chartData.at(-1);
  const prevMonth = chartData.at(-2);
  const balance = thisMonth?.Баланс ?? 0;
  const prevBalance = prevMonth?.Баланс ?? 0;
  const delta = prevBalance ? Math.round(((balance - prevBalance) / Math.abs(prevBalance)) * 100) : 0;

  return (
    <div>
      <PageHeader title={`Привет, ${name}`} subtitle="Финансовый снапшот за этот месяц" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 md:grid-cols-3"
      >
        <StatCard
          label="Баланс месяца"
          value={isLoading ? "—" : money(balance)}
          tone={balance >= 0 ? "success" : "danger"}
          hint={prevMonth ? `vs прошлый: ${delta >= 0 ? "+" : ""}${delta}%` : "нет данных"}
          icon={<Wallet size={18} />}
        />
        <StatCard
          label="Расходы (мес)"
          value={isLoading ? "—" : money(thisMonth?.Расходы ?? 0)}
          tone="danger"
          icon={<TrendingDown size={18} />}
        />
        <StatCard
          label="Доходы (мес)"
          value={isLoading ? "—" : money(thisMonth?.Доходы ?? 0)}
          tone="success"
          icon={<TrendingUp size={18} />}
        />
      </motion.div>

      <section className="mt-8 rounded-2xl border border-border bg-card/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Cashflow · 12 месяцев</h2>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <ComposedChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" stroke="oklch(0.68 0.02 270)" fontSize={11} />
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

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card/60 p-5">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Активные цели</h2>
          <div className="space-y-3">
            {(data?.goals ?? []).slice(0, 4).map((g: any) => {
              const p = g.target_amount ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
              return (
                <div key={g.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{g.name}</span>
                    <span className="font-mono text-muted-foreground tabular-nums">
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

        <section className="rounded-2xl border border-border bg-card/60 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Landmark size={16} /> Кредиты
          </h2>
          {data?.debtsSummary ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Активных</div>
                <div className="font-mono text-xl tabular-nums">{data.debtsSummary.active_count}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Остаток</div>
                <div className="font-mono text-xl tabular-nums">{money(data.debtsSummary.total_remaining)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Платёж/мес</div>
                <div className="font-mono text-xl tabular-nums">{money(data.debtsSummary.total_monthly)}</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Активных кредитов нет.</p>
          )}
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-card/60 p-5">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Последние транзакции</h2>
        <div className="divide-y divide-border">
          {[
            ...((data?.recentExpenses ?? []).map((e: any) => ({ ...e, kind: "exp", at: e.occurred_at }))),
            ...((data?.recentIncomes ?? []).map((i: any) => ({ ...i, kind: "inc", at: i.received_at }))),
          ]
            .sort((a, b) => +new Date(b.at) - +new Date(a.at))
            .slice(0, 6)
            .map((tx: any) => (
              <div key={tx.kind + tx.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  {tx.kind === "exp" ? (
                    <TrendingDown size={18} className="text-destructive" />
                  ) : (
                    <TrendingUp size={18} className="text-success" />
                  )}
                  <div>
                    <div className="text-sm">{tx.description ?? (tx.kind === "exp" ? "Расход" : "Доход")}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(tx.at), "d MMM HH:mm", { locale: ru })}
                    </div>
                  </div>
                </div>
                <div className={`font-mono tabular-nums ${tx.kind === "exp" ? "text-destructive" : "text-success"}`}>
                  {tx.kind === "exp" ? "−" : "+"}
                  {money(tx.amount, tx.currency)}
                </div>
              </div>
            ))}
          {!data?.recentExpenses?.length && !data?.recentIncomes?.length && (
            <p className="py-4 text-sm text-muted-foreground">Транзакций пока нет. Напиши боту в Telegram.</p>
          )}
        </div>
      </section>
    </div>
  );
}