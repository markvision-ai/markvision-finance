import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/finance/PageHeader";
import { StatCard } from "@/components/finance/StatCard";
import { EmptyState } from "@/components/finance/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/incomes")({ component: IncomesPage });

function IncomesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: incomes = [] } = useQuery({
    queryKey: ["incomes"],
    queryFn: async () => {
      const { data } = await supabase.from("incomes" as any).select("*").order("received_at", { ascending: false }).limit(200);
      return (data as any[]) ?? [];
    },
  });
  const total = incomes.reduce((s: number, i: any) => s + Number(i.amount), 0);
  const add = useMutation({
    mutationFn: async (vals: { amount: number; client_name: string; description: string }) => {
      const { error } = await supabase.from("incomes" as any).insert({
        user_id: user!.id,
        amount: vals.amount,
        client_name: vals.client_name || null,
        description: vals.description || null,
        currency: "KZT",
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["incomes"] }); toast.success("Доход добавлен"); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Доходы"
        subtitle="Поступления от клиентов и зарплаты"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus size={16} /> Добавить</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Новый доход</DialogTitle></DialogHeader>
              <IncomeForm onSubmit={(v) => add.mutate(v)} />
            </DialogContent>
          </Dialog>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Всего" value={money(total)} tone="success" />
        <StatCard label="Платежей" value={incomes.length} />
        <StatCard label="Клиентов" value={new Set(incomes.map((i: any) => i.client_name).filter(Boolean)).size} />
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card/60">
        {incomes.length === 0 ? (
          <EmptyState title="Доходов пока нет" description="Нажми «Добавить» или напиши боту в Telegram." />
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

function IncomeForm({ onSubmit }: { onSubmit: (v: { amount: number; client_name: string; description: string }) => void }) {
  const [amount, setAmount] = useState("");
  const [client, setClient] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (!amount) return; onSubmit({ amount: Number(amount), client_name: client, description: desc }); }}
      className="space-y-4"
    >
      <div className="space-y-2"><Label>Сумма, ₸</Label><Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></div>
      <div className="space-y-2"><Label>Клиент</Label><Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Иван" /></div>
      <div className="space-y-2"><Label>Описание</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
      <Button type="submit" className="w-full">Сохранить</Button>
    </form>
  );
}
