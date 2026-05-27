import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRealtime(tables: string[]) {
  const qc = useQueryClient();
  useEffect(() => {
    const channels = tables.map((table) =>
      supabase
        .channel(`realtime:${table}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => {
          qc.invalidateQueries({ queryKey: [table] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        })
        .subscribe()
    );
    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [tables.join(","), qc]);
}