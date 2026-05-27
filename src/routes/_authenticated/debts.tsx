import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/finance/PageHeader";
import { StatCard } from "@/components/finance/StatCard";
import { EmptyState } from "@/components/finance/EmptyState";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/debts")({ component: DebtsPage });

function DebtsPage() {
  const { data: debts = [] } = useQuery({
    queryKey: ["debts"],
    queryFn: async () => {
      const { data } = await supabase.from("debts" as any).select("*").order("is_closed").order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });
  const active = debts.filter((d: any) => !d.is_closed);
  const remaining = active.reduce((s: number, d: any) => s + Number(d.current_balance), 0);
  const monthly = active.reduce((s: number, d: any) => s + Number(d.monthly_payment ?? 0), 0);

  return (
    <div>
      <PageHeader title="Кредиты" subtitle="Что должен и когда закроешь" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Активных" value={active.length} />
        <StatCard label="Остаток" value={money(remaining)} tone="danger" />
        <StatCard label="Платёж/мес" value={money(monthly)} />
      </div>
      <div className="mt-6 space-y-3">
        {debts.length === 0 ? (
          <EmptyState title="Кредитов нет" description="Скажи боту: «новый кредит ипотека 5 000 000 под 8%»." />
        ) : (
          debts.map((d: any) => {
            const paid = Number(d.initial_amount) - Number(d.current_balance);
            const p = d.initial_amount ? (paid / Number(d.initial_amount)) * 100 : 0;
            return (
              <div key={d.id} className="rounded-2xl border border-border bg-card/60 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-medium">{d.name}{d.is_closed && <span className="ml-2 text-xs text-success">закрыт</span>}</div>
                    <div className="text-xs text-muted-foreground">{d.kind} · {d.interest_rate ?? "—"}% · платёж {money(d.monthly_payment ?? 0, d.currency)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg tabular-nums">{money(d.current_balance, d.currency)}</div>
                    <div className="text-xs text-muted-foreground">из {money(d.initial_amount, d.currency)}</div>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, p)}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
