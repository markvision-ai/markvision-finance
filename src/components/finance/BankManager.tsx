import { useState } from "react";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { useBanks } from "@/hooks/use-banks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BankManager() {
  const { banks, add, remove, rename } = useBanks();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5">
      <h2 className="mb-1 text-sm font-medium text-muted-foreground">Банки</h2>
      <p className="mb-3 text-xs text-muted-foreground">Используются при добавлении кредитов.</p>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(name);
          setName("");
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Новый банк" maxLength={40} />
        <Button type="submit" size="icon" aria-label="Добавить"><Plus size={16} /></Button>
      </form>
      <ul className="divide-y divide-border">
        {banks.map((b) => (
          <li key={b} className="flex items-center gap-2 py-2">
            {editing === b ? (
              <>
                <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="h-8" autoFocus maxLength={40} />
                <Button size="icon" variant="ghost" onClick={() => { rename(b, editingName); setEditing(null); }} aria-label="Сохранить"><Check size={14} /></Button>
                <Button size="icon" variant="ghost" onClick={() => setEditing(null)} aria-label="Отмена"><X size={14} /></Button>
              </>
            ) : (
              <>
                <span className="flex-1 truncate text-sm">{b}</span>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setEditingName(b); }} aria-label="Редактировать"><Pencil size={14} /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(b)} aria-label="Удалить"><Trash2 size={14} /></Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}