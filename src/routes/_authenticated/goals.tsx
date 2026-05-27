import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/finance/PageHeader";
import { EmptyState } from "@/components/finance/EmptyState";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/goals")({ component: GoalsPage });

function GoalsPage() {
  const { data: goals = [] } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data } = await supabase.from("goals").select("*").eq("is_archived", false).order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });
  return (
    <div>
      <PageHeader title="Цели" subtitle="Копи, трать осознанно" />
      {goals.length === 0 ? (
        <EmptyState title="Целей пока нет" description="Скажи боту: «новая цель — квартира 5 000 000»." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((g: any) => {
            const p = g.target_amount ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
            return (
              <div key={g.id} className="rounded-2xl border border-border bg-card/60 p-5">
                <div className="text-base font-medium">{g.name}</div>
                <div className="mt-3 font-mono text-2xl tabular-nums">{money(g.current_amount, g.currency)}</div>
                <div className="text-xs text-muted-foreground">из {money(g.target_amount, g.currency)} · {Math.round(p)}%</div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${p}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
