import { useEffect, useState, useCallback } from "react";
import { Home, TrendingDown, TrendingUp, Target, Landmark, CheckSquare, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavKey = "home" | "expenses" | "incomes" | "goals" | "debts" | "tasks" | "settings";

export type NavItem = {
  key: NavKey;
  to: string;
  label: string;
  icon: LucideIcon;
};

export const ALL_NAV: NavItem[] = [
  { key: "home", to: "/", label: "Главная", icon: Home },
  { key: "expenses", to: "/expenses", label: "Расходы", icon: TrendingDown },
  { key: "incomes", to: "/incomes", label: "Доходы", icon: TrendingUp },
  { key: "goals", to: "/goals", label: "Цели", icon: Target },
  { key: "debts", to: "/debts", label: "Кредиты", icon: Landmark },
  { key: "tasks", to: "/tasks", label: "Задачи", icon: CheckSquare },
  { key: "settings", to: "/settings", label: "Настройки", icon: Settings },
];

const STORAGE_KEY = "nav_prefs_v1";

export type NavPrefs = {
  order: NavKey[];
  hidden: NavKey[];
};

const DEFAULTS: NavPrefs = {
  order: ALL_NAV.map((n) => n.key),
  hidden: [],
};

function load(): NavPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<NavPrefs>;
    const known = new Set(ALL_NAV.map((n) => n.key));
    const order = (parsed.order ?? []).filter((k): k is NavKey => known.has(k as NavKey));
    // append any new keys at the end
    for (const n of ALL_NAV) if (!order.includes(n.key)) order.push(n.key);
    const hidden = (parsed.hidden ?? []).filter((k): k is NavKey => known.has(k as NavKey));
    // home and settings should never be hidden
    const safeHidden = hidden.filter((k) => k !== "home" && k !== "settings");
    return { order, hidden: safeHidden };
  } catch {
    return DEFAULTS;
  }
}

const listeners = new Set<() => void>();

export function useNavPrefs() {
  const [prefs, setPrefs] = useState<NavPrefs>(() => load());

  useEffect(() => {
    const l = () => setPrefs(load());
    listeners.add(l);
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) l(); };
    window.addEventListener("storage", onStorage);
    return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
  }, []);

  const save = useCallback((next: NavPrefs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    listeners.forEach((l) => l());
  }, []);

  const toggle = useCallback((key: NavKey) => {
    if (key === "home" || key === "settings") return;
    const cur = load();
    const hidden = cur.hidden.includes(key) ? cur.hidden.filter((k) => k !== key) : [...cur.hidden, key];
    save({ ...cur, hidden });
  }, [save]);

  const move = useCallback((key: NavKey, dir: -1 | 1) => {
    const cur = load();
    const idx = cur.order.indexOf(key);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= cur.order.length) return;
    const order = [...cur.order];
    [order[idx], order[j]] = [order[j], order[idx]];
    save({ ...cur, order });
  }, [save]);

  const reset = useCallback(() => save(DEFAULTS), [save]);

  const orderedAll = prefs.order
    .map((k) => ALL_NAV.find((n) => n.key === k))
    .filter(Boolean) as NavItem[];
  const visible = orderedAll.filter((n) => !prefs.hidden.includes(n.key));

  return { prefs, orderedAll, visible, toggle, move, reset };
}