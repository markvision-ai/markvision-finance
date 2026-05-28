import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay } from "date-fns";

export type Expense = { id: string; amount: number | string; occurred_at: string; category_id?: string | null; expense_categories?: { name: string; color: string | null } | null };
export type Income = { id: string; amount: number | string; received_at: string };

export type CashflowPoint = { day: string; date: string; income: number; expense: number; balance: number };

export function buildCashflow(month: Date, expenses: Expense[], incomes: Income[]): CashflowPoint[] {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const byDay: Record<string, { income: number; expense: number }> = {};
  for (const d of days) byDay[format(d, "yyyy-MM-dd")] = { income: 0, expense: 0 };
  for (const i of incomes) {
    const k = format(new Date(i.received_at), "yyyy-MM-dd");
    if (byDay[k]) byDay[k].income += Number(i.amount);
  }
  for (const e of expenses) {
    const k = format(new Date(e.occurred_at), "yyyy-MM-dd");
    if (byDay[k]) byDay[k].expense += Number(e.amount);
  }
  let running = 0;
  return days.map((d) => {
    const k = format(d, "yyyy-MM-dd");
    running += byDay[k].income - byDay[k].expense;
    return { day: format(d, "d"), date: k, income: byDay[k].income, expense: byDay[k].expense, balance: running };
  });
}

export function cashflowSummary(points: CashflowPoint[]) {
  const daysWithSpend = points.filter((p) => p.expense > 0).length;
  const totalIncome = points.reduce((s, p) => s + p.income, 0);
  const totalExpense = points.reduce((s, p) => s + p.expense, 0);
  const avgIncome = totalIncome / points.length;
  const avgExpense = totalExpense / points.length;
  const expenses = points.map((p) => p.expense).filter((v) => v > 0).sort((a, b) => a - b);
  const median = expenses.length ? expenses[Math.floor(expenses.length / 2)] : 0;
  const peak = points.reduce((m, p) => (p.expense > m.expense ? p : m), points[0] ?? { date: "", expense: 0 } as any);
  return { daysWithSpend, avgIncome, avgExpense, median, peak };
}

export function dayBudget(month: Date, points: CashflowPoint[]) {
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const today = points.find((p) => p.date === todayKey);
  const totalIncome = points.reduce((s, p) => s + p.income, 0);
  const totalExpense = points.reduce((s, p) => s + p.expense, 0);
  const totalDays = points.length || 30;
  const limit = totalIncome > 0 ? totalIncome / totalDays : totalExpense / totalDays;
  const spent = today?.expense ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
  return { spent, limit, pct };
}

export function freeUntilEndOfMonth(month: Date, points: CashflowPoint[]) {
  const today = new Date();
  const remainingDays = points.filter((p) => new Date(p.date) >= new Date(format(today, "yyyy-MM-dd"))).length;
  const totalIncome = points.reduce((s, p) => s + p.income, 0);
  const totalExpense = points.reduce((s, p) => s + p.expense, 0);
  const balance = totalIncome - totalExpense;
  return { balance, remainingDays, perDay: remainingDays > 0 ? balance / remainingDays : 0 };
}

export type Category = { key: string; label: string; color: string | null; amount: number };

export function topCategories(expenses: Expense[], limit = 5): Category[] {
  const acc: Record<string, Category> = {};
  for (const e of expenses) {
    const key = e.category_id ?? "none";
    const label = e.expense_categories?.name ?? "Без категории";
    const color = e.expense_categories?.color ?? null;
    if (!acc[key]) acc[key] = { key, label, color, amount: 0 };
    acc[key].amount += Number(e.amount);
  }
  return Object.values(acc).sort((a, b) => b.amount - a.amount).slice(0, limit);
}

export function savingsRate(income: number, expense: number) {
  if (income <= 0) return 0;
  return Math.max(-100, Math.min(100, Math.round(((income - expense) / income) * 100)));
}

export function debtLoad(income: number, monthly: number) {
  if (income <= 0) return 0;
  return Math.min(100, Math.round((monthly / income) * 100));
}

export function monthDelta(current: number, previous: number) {
  const diff = current - previous;
  const pct = previous !== 0 ? Math.round((diff / Math.abs(previous)) * 100) : current > 0 ? 100 : 0;
  return { diff, pct };
}

export function balanceSparkline(points: CashflowPoint[]): { date: string; value: number }[] {
  return points.map((p) => ({ date: p.date, value: p.balance }));
}

export function isToday(dateISO: string) {
  return isSameDay(new Date(dateISO), new Date());
}