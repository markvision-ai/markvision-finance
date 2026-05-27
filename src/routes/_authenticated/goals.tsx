import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/finance/PageHeader";
import { EmptyState } from "@/components/finance/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money } from "@/lib/format";
import { MoneyInput } from "@/components/finance/MoneyInput";
import { DatePicker } from "@/components/finance/DatePicker";

export const Route = createFileRoute("/_authenticated/goals")({ component: GoalsPage });

function GoalsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: goals = [] } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data } = await supabase.from("goals").select("*").eq("is_archived", false).order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });
  const add = useMutation({
    mutationFn: async (vals: { name: string; target_amount: number; current_amount: number; target_date: string | null }) => {
      const { error } = await supabase.from("goals").insert({
        user_id: user!.id,
        name: vals.name,
        target_amount: vals.target_amount,
        current_amount: vals.current_amount,
        target_date: vals.target_date,
        currency: "KZT",
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); toast.success("Цель создана"); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div>
      <PageHeader
        title="Цели"
        subtitle="Копи осознанно"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus size={16} /> Новая цель</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Новая цель</DialogTitle></DialogHeader>
              <GoalForm onSubmit={(v) => add.mutate(v)} />
            </DialogContent>
          </Dialog>
        }
      />
      {goals.length === 0 ? (
        <EmptyState title="Целей пока нет" description="Нажми «Новая цель» — задай название и сумму." />
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

function GoalForm({ onSubmit }: { onSubmit: (v: { name: string; target_amount: number; current_amount: number; target_date: string | null }) => void }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [date, setDate] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !target) return;
        onSubmit({ name: name.trim(), target_amount: Number(target), current_amount: Number(current || 0), target_date: date || null });
      }}
      className="space-y-4"
    >
      <div className="space-y-2"><Label>Название</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Квартира" autoFocus /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Цель, ₸</Label><MoneyInput value={target} onValueChange={setTarget} placeholder="5 000 000" /></div>
        <div className="space-y-2"><Label>Уже есть, ₸</Label><MoneyInput value={current} onValueChange={setCurrent} placeholder="0" /></div>
      </div>
      <div className="space-y-2"><Label>Целевая дата</Label><DatePicker value={date} onChange={setDate} /></div>
      <Button type="submit" className="w-full">Создать</Button>
    </form>
  );
}
