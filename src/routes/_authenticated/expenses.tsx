import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Plus, Trash2 } from "lucide-react";
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
import { Breakdown } from "@/components/finance/Breakdown";

export const Route = createFileRoute("/_authenticated/expenses")({ component: ExpensesPage });

function ExpensesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("*, expense_categories(name, color)")
        .order("occurred_at", { ascending: false })
        .limit(200);
      return (data as any[]) ?? [];
    },
  });

  const { data: cats = [] } = useQuery({
    queryKey: ["expense_categories"],
    queryFn: async () => {
      const { data } = await supabase.from("expense_categories").select("*").order("name");
      return (data as any[]) ?? [];
    },
  });

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Удалено");
    },
  });

  const add = useMutation({
    mutationFn: async (vals: { amount: number; category_id: string; description: string }) => {
      const { error } = await supabase.from("expenses").insert({
        user_id: user!.id,
        amount: vals.amount,
        category_id: vals.category_id || null,
        description: vals.description || null,
        currency: "KZT",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Расход добавлен");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Расходы"
        subtitle="Все траты — последние 200"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={16} /> Добавить</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Новый расход</DialogTitle></DialogHeader>
              <ExpenseForm cats={cats} onSubmit={(v) => add.mutate(v)} />
            </DialogContent>
          </Dialog>
        }
      />
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Всего" value={money(total)} tone="danger" />
        <StatCard label="Транзакций" value={expenses.length} />
      </div>

      <div className="mt-6">
        <Breakdown
          title="По категориям"
          tone="danger"
          emptyText="Нет расходов с категорией"
          items={Object.values(
            expenses.reduce((acc: Record<string, any>, e: any) => {
              const key = e.category_id ?? "none";
              const label = e.expense_categories?.name ?? "Без категории";
              const color = e.expense_categories?.color ?? null;
              if (!acc[key]) acc[key] = { key, label, color, amount: 0 };
              acc[key].amount += Number(e.amount);
              return acc;
            }, {})
          )}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card/60">
        {expenses.length === 0 ? (
          <EmptyState title="Пока нет расходов" description="Напиши боту «потратил 1500 на обед» или нажми «Добавить»." />
        ) : (
          <ul className="divide-y divide-border">
            {expenses.map((e: any) => (
              <li key={e.id} className="group flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    {e.expense_categories?.color && (
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: e.expense_categories.color }} />
                    )}
                    <span className="font-medium">{e.expense_categories?.name ?? "Без категории"}</span>
                    {e.description && <span className="text-muted-foreground">· {e.description}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{format(new Date(e.occurred_at), "d MMM yyyy, HH:mm", { locale: ru })}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono tabular-nums text-destructive">−{money(e.amount, e.currency)}</span>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(e.id)} className="opacity-0 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ExpenseForm({ cats, onSubmit }: { cats: any[]; onSubmit: (v: any) => void }) {
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!amount) return;
        onSubmit({ amount: Number(amount), category_id: cat, description: desc });
      }}
      className="space-y-4"
    >
      <div className="space-y-2"><Label>Сумма, ₸</Label><MoneyInput value={amount} onValueChange={setAmount} placeholder="1 500" autoFocus /></div>
      <div className="space-y-2"><Label>Категория</Label>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger><SelectValue placeholder="Выбери" /></SelectTrigger>
          <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>Описание</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
      <Button type="submit" className="w-full">Сохранить</Button>
    </form>
  );
}