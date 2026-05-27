import { useEffect, useState, useCallback } from "react";
import { DEFAULT_BANKS } from "@/lib/banks";

const KEY = "mv.banks";

function read(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_BANKS];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [...DEFAULT_BANKS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_BANKS];
  } catch {
    return [...DEFAULT_BANKS];
  }
}

export function useBanks() {
  const [banks, setBanks] = useState<string[]>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setBanks(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: string[]) => {
    setBanks(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }, []);

  const add = useCallback((name: string) => {
    const v = name.trim();
    if (!v) return;
    setBanks((prev) => {
      if (prev.some((b) => b.toLowerCase() === v.toLowerCase())) return prev;
      const next = [...prev, v];
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const remove = useCallback((name: string) => {
    setBanks((prev) => {
      const next = prev.filter((b) => b !== name);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const rename = useCallback((oldName: string, newName: string) => {
    const v = newName.trim();
    if (!v) return;
    setBanks((prev) => {
      const next = prev.map((b) => (b === oldName ? v : b));
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { banks, add, remove, rename, set: persist };
}