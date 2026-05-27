import { Link, useRouterState, Outlet, useNavigate } from "@tanstack/react-router";
import { Home, TrendingDown, TrendingUp, Target, Landmark, CheckSquare, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRealtime } from "@/hooks/use-realtime";

const nav = [
  { to: "/", label: "Главная", icon: Home },
  { to: "/expenses", label: "Расходы", icon: TrendingDown },
  { to: "/incomes", label: "Доходы", icon: TrendingUp },
  { to: "/goals", label: "Цели", icon: Target },
  { to: "/debts", label: "Кредиты", icon: Landmark },
  { to: "/tasks", label: "Задачи", icon: CheckSquare },
  { to: "/settings", label: "Настройки", icon: Settings },
] as const;

export function AppLayout() {
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useRealtime(["expenses", "incomes", "tasks", "debt_payments", "goal_contributions", "goals", "debts"]);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-sidebar md:flex">
        <div className="px-6 py-6">
          <div className="text-lg font-semibold tracking-tight">MarkVision<span className="text-primary">.</span></div>
          <div className="text-xs text-muted-foreground">Финансовый ассистент</div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to as any}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                isActive(to)
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 truncate px-2 text-xs text-muted-foreground">{user?.email}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" as any });
            }}
          >
            <LogOut size={16} /> Выйти
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="pb-20 md:pb-8 md:pl-64">
        <div className="mx-auto max-w-6xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-sidebar/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {nav.slice(0, 5).map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to as any}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px]",
                isActive(to) ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}