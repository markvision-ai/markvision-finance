import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/finance/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryManager } from "@/components/finance/CategoryManager";
import { BankManager } from "@/components/finance/BankManager";
import { NavItemsManager } from "@/components/finance/NavItemsManager";
import { TelegramConnect } from "@/components/onboarding/TelegramConnect";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChevronRight, Tags, Wallet, Landmark } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const current = (user?.user_metadata as any)?.display_name ?? "";
    setDisplayName(current);
  }, [user]);

  const saveName = useMutation({
    mutationFn: async () => {
      const name = displayName.trim().slice(0, 60);
      const { error } = await supabase.auth.updateUser({ data: { display_name: name } });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Имя сохранено"),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Настройки" />
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card/60 p-5">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Профиль</h2>
          <div className="mb-4 text-xs text-muted-foreground">{user?.email}</div>
          <div className="space-y-2">
            <Label>Отображаемое имя</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Как тебя называть"
              maxLength={60}
            />
          </div>
          <Button className="mt-3" onClick={() => saveName.mutate()} disabled={saveName.isPending}>
            Сохранить
          </Button>
        </section>
        <section id="telegram" className="rounded-2xl border border-border bg-card/60 p-5">
          <h2 className="mb-1 text-sm font-medium text-muted-foreground">Telegram</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Подключи бота — после клика откроется чат, нажми <b className="text-foreground">Start</b>,
            и привязка произойдёт автоматически.
          </p>
          <TelegramConnect compact />
        </section>
        <section className="rounded-2xl border border-border bg-card/60 p-5">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Справочники</h2>
          <div className="grid gap-2">
            <SheetRow icon={<Tags size={16} />} label="Категории расходов">
              <CategoryManager kind="expense" title="Категории расходов" />
            </SheetRow>
            <SheetRow icon={<Wallet size={16} />} label="Категории доходов">
              <CategoryManager kind="income" title="Категории доходов" />
            </SheetRow>
            <SheetRow icon={<Landmark size={16} />} label="Банки">
              <BankManager />
            </SheetRow>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card/60 p-5">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Отображаемые разделы в меню</h2>
          <NavItemsManager />
        </section>
      </div>
    </div>
  );
}

function SheetRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-xl border border-border bg-background/40 px-4 py-3 text-left text-sm hover:bg-accent/40">
          <span className="text-muted-foreground">{icon}</span>
          <span className="flex-1">{label}</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{label}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}