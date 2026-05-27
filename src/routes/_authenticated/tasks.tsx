import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/finance/PageHeader";
import { EmptyState } from "@/components/finance/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/finance/DateTimePicker";

export const Route = createFileRoute("/_authenticated/tasks")({ component: TasksPage });

function TasksPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .order("status")
        .order("starts_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });
  const toggle = useMutation({
    mutationFn: async (t: any) => {
      await supabase.from("tasks").update({ status: t.status === "done" ? "pending" : "done" }).eq("id", t.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Задача удалена");
    },
  });
  const add = useMutation({
    mutationFn: async (vals: { title: string; description: string; starts_at: string | null }) => {
      const { error } = await supabase.from("tasks").insert({
        user_id: user!.id,
        title: vals.title,
        description: vals.description || null,
        starts_at: vals.starts_at,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Задача создана");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Задачи"
        subtitle="Что нужно сделать"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={16} /> Новая задача</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Новая задача</DialogTitle></DialogHeader>
              <TaskForm onSubmit={(v) => add.mutate(v)} />
            </DialogContent>
          </Dialog>
        }
      />
      {tasks.length === 0 ? (
        <EmptyState title="Задач нет" description="Нажми «Новая задача» или напиши боту в Telegram." />
      ) : (
        <ul className="space-y-2">
          {tasks.map((t: any) => (
            <li key={t.id} className="group flex items-center gap-3 rounded-xl border border-border bg-card/60 p-4">
              <Button size="icon" variant={t.status === "done" ? "default" : "outline"} onClick={() => toggle.mutate(t)} aria-label="Отметить выполненной">
                <Check size={14} />
              </Button>
              <div className="min-w-0 flex-1">
                <div className={`text-sm ${t.status === "done" ? "text-muted-foreground line-through" : ""}`}>{t.title}</div>
                {t.starts_at && (
                  <div className="text-xs text-muted-foreground">{format(new Date(t.starts_at), "d MMM, HH:mm", { locale: ru })}</div>
                )}
                {t.description && <div className="mt-1 text-xs text-muted-foreground">{t.description}</div>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => del.mutate(t.id)} className="opacity-60 md:opacity-0 md:group-hover:opacity-100" aria-label="Удалить">
                <Trash2 size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskForm({ onSubmit }: { onSubmit: (v: { title: string; description: string; starts_at: string | null }) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({ title: title.trim(), description, starts_at: when || null });
      }}
      className="space-y-4"
    >
      <div className="space-y-2"><Label>Название</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Встреча с клиентом" autoFocus /></div>
      <div className="space-y-2"><Label>Когда</Label><DateTimePicker value={when} onChange={setWhen} placeholder="Выбери дату и время" /></div>
      <div className="space-y-2"><Label>Описание</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
      <Button type="submit" className="w-full">Создать</Button>
    </form>
  );
}
