import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { format, isToday, isTomorrow, isPast, startOfDay, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { Check, Plus, Trash2, CalendarClock, Inbox, Sparkles, RotateCcw, AlarmClock } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/finance/PageHeader";
import { EmptyState } from "@/components/finance/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DateTimePicker } from "@/components/finance/DateTimePicker";
import { TaskDetailDialog } from "@/components/finance/TaskDetailDialog";
import { cn } from "@/lib/utils";
import {
  syncTaskToCalendar,
  deleteCalendarEvent,
  importEventsAsTasks,
} from "@/lib/google-calendar.functions";

export const Route = createFileRoute("/_authenticated/tasks")({ component: TasksPage });

type Filter = "active" | "today" | "done";

function TasksPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [openTask, setOpenTask] = useState<any | null>(null);
  const [filter, setFilter] = useState<Filter>("active");
  const syncFn = useServerFn(syncTaskToCalendar);
  const deleteEventFn = useServerFn(deleteCalendarEvent);
  const importFn = useServerFn(importEventsAsTasks);
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
    staleTime: 30_000,
  });
  const toggle = useMutation({
    mutationFn: async (t: any) => {
      await supabase.from("tasks").update({ status: t.status === "done" ? "pending" : "done" }).eq("id", t.id);
    },
    onSuccess: (_d, t) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["today-tasks"] });
      if (t.status !== "done") toast.success("Готово ✨", { duration: 1500 });
    },
  });
  const del = useMutation({
    mutationFn: async (t: any) => {
      if (t.google_event_id) {
        try {
          await deleteEventFn({ data: { eventId: t.google_event_id } });
        } catch (e) {
          console.warn("calendar delete failed", e);
        }
      }
      const { error } = await supabase.from("tasks").delete().eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Задача удалена");
    },
  });
  const add = useMutation({
    mutationFn: async (vals: { title: string; description: string; starts_at: string | null }) => {
      const { data, error } = await supabase.from("tasks").insert({
        user_id: user!.id,
        title: vals.title,
        description: vals.description || null,
        starts_at: vals.starts_at,
        status: "pending",
      }).select("id").single();
      if (error) throw error;
      if (data?.id && vals.starts_at) {
        try {
          await syncFn({ data: { taskId: data.id } });
        } catch (e) {
          console.warn("calendar sync failed", e);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Задача создана");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const importMut = useMutation({
    mutationFn: () => importFn({ data: { days: 30 } }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["gcal", "today"] });
      toast.success(
        `Импортировано: ${r.imported}${r.skipped ? `, пропущено: ${r.skipped}` : ""}`,
      );
    },
    onError: (e: any) => toast.error(e.message ?? "Не удалось импортировать"),
  });

  // Auto-import GCal events on mount (silent) so the page always reflects
  // what's in Google Calendar, not only manually-added tasks.
  useEffect(() => {
    importFn({ data: { days: 30 } })
      .then(() => {
        qc.invalidateQueries({ queryKey: ["tasks"] });
        qc.invalidateQueries({ queryKey: ["gcal", "today"] });
      })
      .catch((e) => console.warn("auto-import gcal failed", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const active = tasks.filter((t: any) => t.status !== "done").length;
    const today = tasks.filter((t: any) => t.status !== "done" && t.starts_at && isToday(new Date(t.starts_at))).length;
    const done = tasks.filter((t: any) => t.status === "done").length;
    return { active, today, done };
  }, [tasks]);

  const filtered = useMemo(() => {
    if (filter === "done") return tasks.filter((t: any) => t.status === "done");
    if (filter === "today") return tasks.filter((t: any) => t.status !== "done" && t.starts_at && isToday(new Date(t.starts_at)));
    return tasks.filter((t: any) => t.status !== "done");
  }, [tasks, filter]);

  const groups = useMemo(() => groupTasks(filtered), [filtered]);

  return (
    <div>
      <PageHeader
        title="Задачи"
        subtitle="Что нужно сделать"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => importMut.mutate()}
              disabled={importMut.isPending}
              title="Импортировать события из Google Calendar"
            >
              {importMut.isPending ? "Импорт…" : "Импорт из календаря"}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus size={16} /> Новая задача</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Новая задача</DialogTitle></DialogHeader>
                <TaskForm onSubmit={(v) => add.mutate(v)} />
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-4">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
          <TabsTrigger value="active" className="gap-1.5">
            <Inbox size={14} /> Активные
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{counts.active}</Badge>
          </TabsTrigger>
          <TabsTrigger value="today" className="gap-1.5">
            <AlarmClock size={14} /> Сегодня
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{counts.today}</Badge>
          </TabsTrigger>
          <TabsTrigger value="done" className="gap-1.5">
            <Sparkles size={14} /> Готово
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{counts.done}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState
          title={filter === "done" ? "Пока ничего не выполнено" : filter === "today" ? "На сегодня свободно ✨" : "Задач нет"}
          description={filter === "active" ? "Нажми «Новая задача» или напиши боту в Telegram." : undefined}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <h3 className={cn("text-xs font-semibold uppercase tracking-wider", g.tone === "danger" ? "text-destructive" : g.tone === "primary" ? "text-primary" : "text-muted-foreground")}>{g.label}</h3>
                <span className="text-xs text-muted-foreground">· {g.items.length}</span>
              </div>
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {g.items.map((t: any) => (
                    <motion.li
                      key={t.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40, scale: 0.96, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.2 }}
                    >
                      <TaskRow
                        t={t}
                        overdue={isOverdue(t)}
                        onToggle={() => toggle.mutate(t)}
                        onDelete={() => del.mutate(t)}
                        onOpen={() => setOpenTask(t)}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}
      <TaskDetailDialog task={openTask} open={!!openTask} onOpenChange={(v) => !v && setOpenTask(null)} />
    </div>
  );
}

function isOverdue(t: any) {
  if (t.status === "done") return false;
  if (!t.starts_at) return false;
  const d = new Date(t.starts_at);
  return isPast(d) && !isSameDay(d, new Date());
}

function groupTasks(list: any[]) {
  const now = new Date();
  const buckets: Record<string, { key: string; label: string; tone?: "danger" | "primary" | "muted"; order: number; items: any[] }> = {};
  const put = (key: string, label: string, order: number, tone: any, t: any) => {
    if (!buckets[key]) buckets[key] = { key, label, tone, order, items: [] };
    buckets[key].items.push(t);
  };
  for (const t of list) {
    if (t.status === "done") { put("done", "Выполненные", 99, "muted", t); continue; }
    if (!t.starts_at) { put("nodate", "Без даты", 50, "muted", t); continue; }
    const d = new Date(t.starts_at);
    if (isPast(d) && !isSameDay(d, now)) put("overdue", "Просрочено", 0, "danger", t);
    else if (isToday(d)) put("today", "Сегодня", 1, "primary", t);
    else if (isTomorrow(d)) put("tomorrow", "Завтра", 2, undefined, t);
    else put("later", "Позже", 3, undefined, t);
  }
  return Object.values(buckets).sort((a, b) => a.order - b.order);
}

function TaskRow({ t, overdue, onToggle, onDelete, onOpen }: {
  t: any; overdue: boolean; onToggle: () => void; onDelete: () => void; onOpen: () => void;
}) {
  const done = t.status === "done";
  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 overflow-hidden rounded-2xl border bg-card/60 p-3 pl-4 transition-all hover:bg-card hover:shadow-sm sm:p-4",
        overdue ? "border-destructive/40" : "border-border",
        done && "opacity-60",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-[3px]",
          done ? "bg-success" : overdue ? "bg-destructive" : t.starts_at && isToday(new Date(t.starts_at)) ? "bg-primary" : "bg-transparent",
        )}
      />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        aria-label={done ? "Вернуть в активные" : "Отметить выполненной"}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          done
            ? "border-success bg-success text-success-foreground"
            : "border-border bg-background hover:border-primary hover:scale-105",
        )}
      >
        {done ? <RotateCcw size={14} /> : <Check size={14} className="opacity-0 group-hover:opacity-60 transition-opacity" />}
      </button>

      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className={cn("text-sm font-medium leading-snug", done && "line-through")}>{t.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {t.starts_at && (
            <span className={cn("inline-flex items-center gap-1", overdue && "text-destructive font-medium")}>
              <CalendarClock size={12} />
              {format(new Date(t.starts_at), "d MMM, HH:mm", { locale: ru })}
            </span>
          )}
          {t.google_event_id && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">GCal</span>
          )}
          {t.description && <span className="truncate">{t.description}</span>}
        </div>
      </button>

      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="shrink-0 text-muted-foreground opacity-60 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
        aria-label="Удалить"
      >
        <Trash2 size={14} />
      </Button>
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
