import { Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw, GripVertical } from "lucide-react";
import { useNavPrefs } from "@/hooks/use-nav-prefs";
import { Button } from "@/components/ui/button";

export function NavItemsManager() {
  const { orderedAll, prefs, toggle, move, reset } = useNavPrefs();

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Выбери разделы, которые видны в нижнем меню на телефоне и в боковом на десктопе.
        Первые 4 видимых — в нижней панели, остальные в «Ещё». Главная и Настройки всегда видны.
      </p>
      <ul className="divide-y divide-border rounded-xl border border-border bg-background/40">
        {orderedAll.map(({ key, label, icon: Icon }, idx) => {
          const hidden = prefs.hidden.includes(key);
          const locked = key === "home" || key === "settings";
          return (
            <li key={key} className="flex items-center gap-2 px-3 py-2.5">
              <GripVertical size={14} className="shrink-0 text-muted-foreground/50" />
              <Icon size={16} className={hidden ? "text-muted-foreground/50" : "text-foreground"} />
              <span className={`flex-1 text-sm ${hidden ? "text-muted-foreground/60 line-through" : ""}`}>{label}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={idx === 0} onClick={() => move(key, -1)} aria-label="Выше">
                <ChevronUp size={14} />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={idx === orderedAll.length - 1} onClick={() => move(key, 1)} aria-label="Ниже">
                <ChevronDown size={14} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={locked}
                onClick={() => toggle(key)}
                aria-label={hidden ? "Показать" : "Скрыть"}
                title={locked ? "Этот раздел всегда виден" : hidden ? "Показать" : "Скрыть"}
              >
                {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </Button>
            </li>
          );
        })}
      </ul>
      <Button variant="ghost" size="sm" onClick={reset} className="gap-2">
        <RotateCcw size={14} /> Сбросить
      </Button>
    </div>
  );
}