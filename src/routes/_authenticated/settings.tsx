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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChevronRight, Tags, Wallet, Landmark } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [chatId, setChatId] = useState("");

  const { data: tg } = useQuery({
    queryKey: ["telegram_users"],
    queryFn: async () => {
      const { data } = await supabase.from("telegram_users").select("*").maybeSingle();
      return data;
    },
  });
  useEffect(() => { if (tg?.telegram_chat_id) setChatId(String(tg.telegram_chat_id)); }, [tg]);

  const save = useMutation({
    mutationFn: async () => {
      const id = Number(chatId);
      if (!id) throw new Error("Введи числовой chat_id");
      if (tg) {
        await supabase.from("telegram_users").update({ telegram_chat_id: id }).eq("id", tg.id);
      } else {
        await supabase.from("telegram_users").insert({ user_id: user!.id, telegram_chat_id: id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["telegram_users"] });
      toast.success("Telegram привязан");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Настройки" />
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card/60 p-5">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Профиль</h2>
          <div className="text-sm">{user?.email}</div>
        </section>
        <section className="rounded-2xl border border-border bg-card/60 p-5">
          <h2 className="mb-1 text-sm font-medium text-muted-foreground">Telegram</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Напиши <code className="rounded bg-muted px-1.5 py-0.5">@userinfobot</code> — он скажет твой chat_id. Вставь сюда.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label>Chat ID</Label>
              <Input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="123456789" />
            </div>
          </div>
          <Button className="mt-3" onClick={() => save.mutate()} disabled={save.isPending}>Сохранить</Button>
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