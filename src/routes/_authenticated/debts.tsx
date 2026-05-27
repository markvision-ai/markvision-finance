import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money } from "@/lib/format";
import { MoneyInput } from "@/components/finance/MoneyInput";
import { useBanks } from "@/hooks/use-banks";

export const Route = createFileRoute("/_authenticated/debts")({ component: DebtsPage });

function DebtsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
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
  const add = useMutation({
    mutationFn: async (v: { name: string; kind: string; initial_amount: number; monthly_payment: number; bank: string }) => {
      const { error } = await supabase.from("debts" as any).insert({
        user_id: user!.id,
        name: v.name,
        kind: v.kind,
        initial_amount: v.initial_amount,
        current_balance: v.initial_amount,
        monthly_payment: v.monthly_payment || null,
        description: v.bank || null,
        currency: "KZT",
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["debts"] }); toast.success("Кредит добавлен"); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Кредиты"
        subtitle="Что должен и когда закроешь"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus size={16} /> Добавить</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Новый кредит</DialogTitle></DialogHeader>
              <DebtForm onSubmit={(v) => add.mutate(v)} />
            </DialogContent>
          </Dialog>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Активных" value={active.length} />
        <StatCard label="Остаток" value={money(remaining)} tone="danger" />
        <StatCard label="Платёж/мес" value={money(monthly)} />
      </div>
      <div className="mt-6 space-y-3">
        {debts.length === 0 ? (
          <EmptyState title="Кредитов нет" description="Нажми «Добавить» — укажи сумму и платёж." />
        ) : (
          debts.map((d: any) => {
            const paid = Number(d.initial_amount) - Number(d.current_balance);
            const p = d.initial_amount ? (paid / Number(d.initial_amount)) * 100 : 0;
            return (
              <div key={d.id} className="rounded-2xl border border-border bg-card/60 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-medium">{d.name}{d.is_closed && <span className="ml-2 text-xs text-success">закрыт</span>}</div>
                    <div className="text-xs text-muted-foreground">
                      {kindLabel(d.kind)}{d.description ? ` · ${d.description}` : ""} · платёж {money(d.monthly_payment ?? 0, d.currency)}
                    </div>
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

function kindLabel(k: string) {
  return ({ loan: "Кредит", mortgage: "Ипотека", card: "Кредитка", personal: "Долг" } as Record<string, string>)[k] ?? k;
}

function DebtForm({ onSubmit }: { onSubmit: (v: { name: string; kind: string; initial_amount: number; monthly_payment: number; bank: string }) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("loan");
  const [initial, setInitial] = useState("");
  const [monthly, setMonthly] = useState("");
  const { banks } = useBanks();
  const [bank, setBank] = useState(banks[0] ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !initial) return;
        onSubmit({ name: name.trim(), kind, initial_amount: Number(initial), monthly_payment: Number(monthly || 0), bank });
      }}
      className="space-y-4"
    >
      <div className="space-y-2"><Label>Название</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ипотека" autoFocus /></div>
      <div className="space-y-2"><Label>Тип</Label>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="loan">Кредит</SelectItem>
            <SelectItem value="mortgage">Ипотека</SelectItem>
            <SelectItem value="card">Кредитка</SelectItem>
            <SelectItem value="personal">Долг</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Сумма, ₸</Label><MoneyInput value={initial} onValueChange={setInitial} placeholder="2 000 000" /></div>
        <div className="space-y-2"><Label>Платёж/мес, ₸</Label><MoneyInput value={monthly} onValueChange={setMonthly} placeholder="80 000" /></div>
      </div>
      <div className="space-y-2"><Label>Банк</Label>
        <Select value={bank} onValueChange={setBank}>
          <SelectTrigger><SelectValue placeholder="Выбери банк" /></SelectTrigger>
          <SelectContent>
            {banks.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Добавить/удалить банк можно в Настройках.</p>
      </div>
      <Button type="submit" className="w-full">Создать</Button>
    </form>
  );
}
