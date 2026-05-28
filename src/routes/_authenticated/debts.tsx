import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Plus, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, getDate } from "date-fns";
import { ru } from "date-fns/locale";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";
import { MoneyInput } from "@/components/finance/MoneyInput";
import { useBanks } from "@/hooks/use-banks";
import { Breakdown } from "@/components/finance/Breakdown";
import { createDebtReminder } from "@/lib/google-calendar.functions";

export const Route = createFileRoute("/_authenticated/debts")({ component: DebtsPage });

function DebtsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const reminderFn = useServerFn(createDebtReminder);
  const [cursor, setCursor] = useState(startOfMonth(new Date()));
  const { data: debts = [] } = useQuery({
    queryKey: ["debts"],
    queryFn: async () => {
      const { data } = await supabase.from("debts" as any).select("*").order("is_closed").order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
  const active = debts.filter((d: any) => !d.is_closed);
  const remaining = active.reduce((s: number, d: any) => s + Number(d.current_balance), 0);
  const monthly = active.reduce((s: number, d: any) => s + Number(d.monthly_payment ?? 0), 0);
  const add = useMutation({
    mutationFn: async (v: { name: string; kind: string; initial_amount: number; monthly_payment: number; bank: string; pay_date: Date | null }) => {
      const { error } = await supabase.from("debts" as any).insert({
        user_id: user!.id,
        name: v.name,
        kind: v.kind,
        initial_amount: v.initial_amount,
        current_balance: v.initial_amount,
        monthly_payment: v.monthly_payment || null,
        description: v.bank || null,
        start_date: v.pay_date ? format(v.pay_date, "yyyy-MM-dd") : null,
        currency: "KZT",
      });
      if (error) throw error;
      if (v.pay_date && v.monthly_payment) {
        try {
          await reminderFn({
            data: {
              title: `Платёж: ${v.name}${v.bank ? ` (${v.bank})` : ""}`,
              description: `Сумма: ${money(v.monthly_payment)}`,
              startDate: format(v.pay_date, "yyyy-MM-dd"),
              recurMonthly: true,
            },
          });
        } catch (e) {
          console.warn("debt reminder failed", e);
        }
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["debts"] }); toast.success("Кредит добавлен"); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const monthDays = useMemo(() => eachDayOfInterval({ start: startOfMonth(cursor), end: endOfMonth(cursor) }), [cursor]);
  const debtsByDay = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const d of active) {
      if (!d.start_date) continue;
      const day = Number(d.start_date.slice(8, 10));
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(d);
    }
    return map;
  }, [active]);
  const leadingBlanks = (getDay(startOfMonth(cursor)) + 6) % 7; // Mon-first

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

      {active.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Breakdown
            title="Остаток по банкам"
            tone="danger"
            emptyText="Банк не указан"
            items={Object.values(
              active.reduce((acc: Record<string, any>, d: any) => {
                const key = (d.description ?? "Без банка").toString();
                if (!acc[key]) acc[key] = { key, label: key, amount: 0 };
                acc[key].amount += Number(d.current_balance);
                return acc;
              }, {})
            )}
          />
          <Breakdown
            title="Платёж/мес по банкам"
            emptyText="Нет данных"
            items={Object.values(
              active.reduce((acc: Record<string, any>, d: any) => {
                const key = (d.description ?? "Без банка").toString();
                if (!acc[key]) acc[key] = { key, label: key, amount: 0 };
                acc[key].amount += Number(d.monthly_payment ?? 0);
                return acc;
              }, {})
            )}
          />
        </div>
      )}

      {active.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">Календарь платежей</div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, -1))}><ChevronLeft size={16} /></Button>
              <div className="min-w-[140px] text-center text-sm capitalize">{format(cursor, "LLLL yyyy", { locale: ru })}</div>
              <Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight size={16} /></Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
            {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`b${i}`} />)}
            {monthDays.map((day) => {
              const list = debtsByDay.get(getDate(day)) ?? [];
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className={cn(
                  "min-h-[56px] rounded-lg border p-1 text-left text-[10px]",
                  list.length ? "border-primary/40 bg-primary/5" : "border-border/40",
                  isToday && "ring-1 ring-primary"
                )}>
                  <div className="text-[11px] font-medium">{getDate(day)}</div>
                  <div className="space-y-0.5">
                    {list.slice(0,2).map((d) => (
                      <div key={d.id} className="truncate rounded bg-primary/15 px-1 py-0.5 text-primary" title={`${d.name} · ${money(d.monthly_payment ?? 0, d.currency)}`}>
                        {d.name}
                      </div>
                    ))}
                    {list.length > 2 && <div className="text-muted-foreground">+{list.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {debts.length === 0 ? (
          <EmptyState title="Кредитов нет" description="Нажми «Добавить» — укажи сумму и платёж." />
        ) : (
          debts.map((d: any) => {
            const paid = Number(d.initial_amount) - Number(d.current_balance);
            const p = d.initial_amount ? (paid / Number(d.initial_amount)) * 100 : 0;
            const left = Number(d.current_balance);
            const monthsLeft = d.monthly_payment ? Math.ceil(left / Number(d.monthly_payment)) : null;
            const payDay = d.start_date ? Number(d.start_date.slice(8, 10)) : null;
            return (
              <div key={d.id} className="rounded-2xl border border-border bg-card/60 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-medium">{d.name}{d.is_closed && <span className="ml-2 text-xs text-success">закрыт</span>}</div>
                    <div className="text-xs text-muted-foreground">
                      {kindLabel(d.kind)}{d.description ? ` · ${d.description}` : ""} · платёж {money(d.monthly_payment ?? 0, d.currency)}
                      {payDay ? ` · ${payDay} числа` : ""}
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
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Погашено {Math.round(p)}% · {money(paid, d.currency)}</span>
                  <span>{monthsLeft != null ? `≈ ${monthsLeft} мес. до закрытия` : "Укажи платёж"}</span>
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

function DebtForm({ onSubmit }: { onSubmit: (v: { name: string; kind: string; initial_amount: number; monthly_payment: number; bank: string; pay_date: Date | null }) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("loan");
  const [initial, setInitial] = useState("");
  const [monthly, setMonthly] = useState("");
  const { banks } = useBanks();
  const [bank, setBank] = useState(banks[0] ?? "");
  const [payDate, setPayDate] = useState<Date | undefined>();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !initial) return;
        onSubmit({ name: name.trim(), kind, initial_amount: Number(initial), monthly_payment: Number(monthly || 0), bank, pay_date: payDate ?? null });
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
      <div className="space-y-2">
        <Label>Дата платежа</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className={cn("w-full justify-start text-left font-normal", !payDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {payDate ? format(payDate, "d MMMM yyyy", { locale: ru }) : "Выбери день"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={payDate} onSelect={setPayDate} locale={ru} captionLayout="dropdown" initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">Будем подсвечивать этот день в календаре платежей.</p>
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
