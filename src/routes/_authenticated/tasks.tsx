import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/finance/PageHeader";
import { EmptyState } from "@/components/finance/EmptyState";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/tasks")({ component: TasksPage });

function TasksPage() {
  const qc = useQueryClient();
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").order("starts_at");
      return (data as any[]) ?? [];
    },
  });
  const toggle = useMutation({
    mutationFn: async (t: any) => {
      await supabase.from("tasks").update({ status: t.status === "done" ? "pending" : "done" }).eq("id", t.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <div>
      <PageHeader title="Задачи" subtitle="Из календаря и от бота" />
      {tasks.length === 0 ? (
        <EmptyState title="Задач нет" description="Скажи боту: «завтра в 15 встреча с клиентом»." />
      ) : (
        <ul className="space-y-2">
          {tasks.map((t: any) => (
            <li key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-4">
              <Button size="icon" variant={t.status === "done" ? "default" : "outline"} onClick={() => toggle.mutate(t)}>
                <Check size={14} />
              </Button>
              <div className="flex-1">
                <div className={`text-sm ${t.status === "done" ? "text-muted-foreground line-through" : ""}`}>{t.title}</div>
                <div className="text-xs text-muted-foreground">{format(new Date(t.starts_at), "d MMM, HH:mm", { locale: ru })}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
