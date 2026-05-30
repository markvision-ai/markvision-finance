import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CheckCircle2, ListChecks, Wallet, Landmark, Target, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { TelegramConnect } from "@/components/onboarding/TelegramConnect";

export const Route = createFileRoute("/_authenticated/welcome")({
  component: WelcomePage,
});

function WelcomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName =
    (user?.user_metadata as any)?.display_name?.split(" ")[0]?.trim() ||
    user?.email?.split("@")[0] ||
    "друг";

  function skip() {
    try { localStorage.removeItem("mv_pending_onboarding"); } catch {}
    navigate({ to: "/" as any, replace: true });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card/80 to-primary/5 p-6 shadow-2xl sm:p-10"
      >
        <div className="mb-6 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
          <Sparkles size={14} /> Шаг 1 из 1
        </div>

        <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">
          🎉 Добро пожаловать, {firstName}!
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Спасибо за регистрацию на{" "}
          <span className="font-medium text-foreground">MarkVision Finance</span> — вашем
          личном AI-ассистенте управления финансами и задачами.
        </p>

        <p className="mt-4 text-sm text-muted-foreground sm:text-base">
          Сервис помогает в одном месте контролировать всё, что важно. Управляй голосом,
          текстом или фото чека прямо в Telegram — мы сами разнесём это по категориям.
        </p>

        <div className="my-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Feature icon={<ListChecks size={16} />} label="Задачи и встречи" />
          <Feature icon={<Wallet size={16} />} label="Расходы и доходы" />
          <Feature icon={<Landmark size={16} />} label="Кредиты" />
          <Feature icon={<Target size={16} />} label="Финансовые цели" />
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-background/40 p-5">
          <h2 className="mb-1 text-sm font-semibold">Подключи Telegram-бота</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Это основной способ управлять финансами и задачами на ходу. Без него
            половина магии не работает.
          </p>
          <TelegramConnect
            redirectTo="/"
            onConnected={() => {
              try { localStorage.removeItem("mv_pending_onboarding"); } catch {}
            }}
          />
        </div>

        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={skip}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Пропустить — настроить позже
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </span>
      <span className="text-xs font-medium">{label}</span>
      <CheckCircle2 size={12} className="ml-auto text-success/60" />
    </div>
  );
}