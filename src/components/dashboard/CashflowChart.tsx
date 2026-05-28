import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { money } from "@/lib/format";
import type { CashflowPoint } from "@/lib/dashboard";

export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  return (
    <div className="h-60 w-full sm:h-72">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ left: -12, right: 8, top: 12, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--success)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--success)" stopOpacity={0.55} />
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--destructive)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" opacity={0.6} vertical={false} />
          <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} dy={6} interval="preserveStartEnd" minTickGap={12} />
          <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={40} />
          <Tooltip
            cursor={{ fill: "color-mix(in oklab, var(--primary) 10%, transparent)", radius: 8 }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              boxShadow: "0 10px 30px -10px rgba(0,0,0,0.6)",
              fontSize: 12,
              padding: "8px 12px",
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 600, marginBottom: 4 }}
            formatter={(v: any, name: string) => [money(Number(v)), name === "income" ? "Доходы" : name === "expense" ? "Расходы" : "Баланс"]}
          />
          <Bar dataKey="income" fill="url(#incomeGrad)" radius={[6, 6, 0, 0]} maxBarSize={22} />
          <Bar dataKey="expense" fill="url(#expenseGrad)" radius={[6, 6, 0, 0]} maxBarSize={22} />
          <Line
            dataKey="balance"
            stroke="var(--primary)"
            strokeWidth={2.5}
            type="monotone"
            dot={false}
            activeDot={{ r: 4, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}