import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Kind = "expense" | "income";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `c-${Date.now()}`;
}

const PALETTE = ["#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899", "#6b7280"];

export function CategoryManager({ kind, title }: { kind: Kind; title: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const table = kind === "expense" ? "expense_categories" : "income_categories";
  const key = [table];
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const { data: cats = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data } = await supabase.from(table).select("*").order("name");
      return (data as any[]) ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Введи название");
      const color = PALETTE[cats.length % PALETTE.length];
      const { error } = await supabase.from(table).insert({
        user_id: user!.id,
        name: trimmed,
        slug: slugify(trimmed) + "-" + Math.random().toString(36).slice(2, 6),
        color,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      setName("");
      toast.success("Категория добавлена");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rename = useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
      const { error } = await supabase.from(table).update({ name: newName.trim() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      setEditingId(null);
      toast.success("Сохранено");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Удалено");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h2>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Новая категория" maxLength={40} />
        <Button type="submit" size="icon" aria-label="Добавить"><Plus size={16} /></Button>
      </form>
      <ul className="divide-y divide-border">
        {cats.length === 0 && <li className="py-3 text-xs text-muted-foreground">Пока пусто</li>}
        {cats.map((c: any) => (
          <li key={c.id} className="flex items-center gap-2 py-2">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
            {editingId === c.id ? (
              <>
                <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="h-8" autoFocus maxLength={40} />
                <Button size="icon" variant="ghost" onClick={() => rename.mutate({ id: c.id, newName: editingName })} aria-label="Сохранить"><Check size={14} /></Button>
                <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} aria-label="Отмена"><X size={14} /></Button>
              </>
            ) : (
              <>
                <span className="flex-1 truncate text-sm">{c.name}</span>
                <Button size="icon" variant="ghost" onClick={() => { setEditingId(c.id); setEditingName(c.name); }} aria-label="Редактировать"><Pencil size={14} /></Button>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(c.id)} aria-label="Удалить"><Trash2 size={14} /></Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}