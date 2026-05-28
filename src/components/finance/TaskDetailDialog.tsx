import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Check, X, CalendarClock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/finance/DateTimePicker";
import { syncTaskToCalendar, deleteCalendarEvent } from "@/lib/google-calendar.functions";
import { cn } from "@/lib/utils";

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
}: {
  task: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const syncFn = useServerFn(syncTaskToCalendar);
  const deleteEventFn = useServerFn(deleteCalendarEvent);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [newWhen, setNewWhen] = useState("");

  useEffect(() => {
    if (open && task?.starts_at) setNewWhen(task.starts_at);
    if (!open) setReschedOpen(false);
  }, [open, task]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["tasks", "dashboard"] });
    qc.invalidateQueries({ queryKey: ["task-stats"] });
  };

  const setStatus = useMutation({
    mutationFn: async (status: "done" | "pending" | "cancelled") => {
      const { error } = await supabase
        .from("tasks")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", task!.id);
      if (error) throw error;
    },
    onSuccess: (_d, status) => {
      invalidate();
      toast.success(
        status === "done" ? "Задача выполнена" :
        status === "cancelled" ? "Задача отменена" : "Возвращено в работу"
      );
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reschedule = useMutation({
    mutationFn: async (when: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ starts_at: when, status: "pending", updated_at: new Date().toISOString() })
        .eq("id", task!.id);
      if (error) throw error;
      try {
        await syncFn({ data: { taskId: task!.id } });
      } catch (e) {
        console.warn("calendar resync failed", e);
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Перенесено");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      if (task?.google_event_id) {
        try { await deleteEventFn({ data: { eventId: task.google_event_id } }); } catch {}
      }
      const { error } = await supabase.from("tasks").delete().eq("id", task!.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Удалено"); onOpenChange(false); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!task) return null;
  const statusLabel = task.status === "done" ? "Выполнена" : task.status === "cancelled" ? "Отменена" : "В работе";
  const statusTone = task.status === "done" ? "text-success" : task.status === "cancelled" ? "text-muted-foreground" : "text-primary";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="pr-6">{task.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-xs">
            <span className={cn("rounded-full px-2 py-0.5", statusTone, "bg-muted/40")}>{statusLabel}</span>
            {task.starts_at && (
              <span className="text-muted-foreground">
                {format(new Date(task.starts_at), "d MMMM yyyy, HH:mm", { locale: ru })}
              </span>
            )}
          </div>
          {task.description && (
            <p className="whitespace-pre-wrap text-muted-foreground">{task.description}</p>
          )}

          {reschedOpen ? (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <Label>Новая дата и время</Label>
              <DateTimePicker value={newWhen} onChange={setNewWhen} placeholder="Выбери дату и время" />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" disabled={!newWhen || reschedule.isPending} onClick={() => reschedule.mutate(newWhen)}>
                  Перенести
                </Button>
                <Button size="sm" variant="outline" onClick={() => setReschedOpen(false)}>Отмена</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {task.status !== "done" && (
                <Button size="sm" onClick={() => setStatus.mutate("done")} disabled={setStatus.isPending}>
                  <Check size={14} /> Выполнено
                </Button>
              )}
              {task.status === "done" && (
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate("pending")} disabled={setStatus.isPending}>
                  Вернуть в работу
                </Button>
              )}
              {task.status !== "cancelled" && (
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate("cancelled")} disabled={setStatus.isPending}>
                  <X size={14} /> Отменить
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setReschedOpen(true)}>
                <CalendarClock size={14} /> Перенести
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => del.mutate()} disabled={del.isPending}>
                <Trash2 size={14} /> Удалить
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}