import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllUsers, deleteUser } from "@/lib/admin.functions";
import { PageHeader } from "@/components/finance/PageHeader";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Shield, Mail, MessageCircle, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const fetchUsers = useServerFn(listAllUsers);
  const removeUser = useServerFn(deleteUser);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetchUsers(),
  });

  const delMutation = useMutation({
    mutationFn: (userId: string) => removeUser({ data: { userId } }),
    onSuccess: () => {
      toast.success("Пользователь удалён");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (error) {
    return (
      <div>
        <PageHeader title="Админка" />
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
          Нет доступа. Только для админов.
        </div>
      </div>
    );
  }

  const users = data?.users ?? [];

  return (
    <div>
      <PageHeader title="Админка" subtitle={`${users.length} пользователей`} />
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Загрузка…</div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="rounded-2xl border border-border bg-card/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 truncate text-sm font-medium">
                    {u.display_name || u.email || u.id.slice(0, 8)}
                    {u.roles.includes("admin") && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                        <Shield size={10} /> admin
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail size={12} /> {u.email ?? "—"}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MessageCircle size={12} />
                    {u.telegram_username ? `@${u.telegram_username}` : "username не задан"}
                    {u.telegram_chat_id && (
                      <span className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                        {String(u.telegram_chat_id)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar size={12} />
                    рег. {format(new Date(u.created_at), "d MMM yyyy", { locale: ru })}
                    {u.last_sign_in_at && (
                      <span className="ml-2">
                        · вход {format(new Date(u.last_sign_in_at), "d MMM HH:mm", { locale: ru })}
                      </span>
                    )}
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={delMutation.isPending}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {u.email || u.display_name || u.id} — все данные пользователя будут безвозвратно удалены.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => delMutation.mutate(u.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Удалить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="mt-2 font-mono text-[10px] text-muted-foreground/60">{u.id}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}