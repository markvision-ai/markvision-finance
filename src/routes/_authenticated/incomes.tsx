import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/finance/PageHeader";
import { StatCard } from "@/components/finance/StatCard";
import { EmptyState } from "@/components/finance/EmptyState";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/incomes")({ component: IncomesPage });

function IncomesPage() {
  const { data: incomes = [] } = useQuery({
    queryKey: ["incomes"],
    queryFn: async () => {
      const { data } = await supabase.from("incomes" as any).select("*").order("received_at", { ascending: false }).limit(200);
      return (data as any[]) ?? [];
    },
  });
  const total = incomes.reduce((s: number, i: any) => s + Number(i.amount), 0);

  return (
    <div>
      <PageHeader title="Доходы" subtitle="Поступления от клиентов и зарплат" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Всего" value={money(total)} tone="success" />
        <StatCard label="Платежей" value={incomes.length} />
        <StatCard label="Клиентов" value={new Set(incomes.map((i: any) => i.client_name).filter(Boolean)).size} />
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card/60">
        {incomes.length === 0 ? (
          <EmptyState title="Доходов пока нет" description="Скажи боту «поступила оплата 50000 от клиента Иван»." />
        ) : (
          <ul className="divide-y divide-border">
            {incomes.map((i: any) => (
              <li key={i.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{i.client_name ?? i.description ?? "Доход"}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(i.received_at), "d MMM yyyy, HH:mm", { locale: ru })}</div>
                </div>
                <span className="font-mono tabular-nums text-success">+{money(i.amount, i.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
