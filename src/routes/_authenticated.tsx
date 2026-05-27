import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" as any, replace: true });
    }
  }, [loading, user, navigate]);

  // Realtime sync: when bot (or another device) inserts/updates expenses,
  // incomes, tasks, debts, goals — invalidate the relevant caches so the UI
  // reflects new data instantly.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`rt-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["dashboard"] });
          qc.invalidateQueries({ queryKey: ["expenses"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incomes", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["dashboard"] });
          qc.invalidateQueries({ queryKey: ["incomes"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["tasks"] });
          qc.invalidateQueries({ queryKey: ["today-tasks"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "debts", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["debts"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goals", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["goals"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <AppLayout />;
}