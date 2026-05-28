import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { importEventsAsTasks } from "@/lib/google-calendar.functions";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const importGcal = useServerFn(importEventsAsTasks);

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
    // Auto-sync Google Calendar → tasks on session start so the app reflects
    // every event from the calendar, not only manually-added ones.
    importGcal({ data: { days: 30 } })
      .then(() => {
        qc.invalidateQueries({ queryKey: ["tasks"] });
        qc.invalidateQueries({ queryKey: ["today-tasks"] });
        qc.invalidateQueries({ queryKey: ["gcal", "today"] });
      })
      .catch((e) => console.warn("gcal auto-sync failed", e));
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
        () => {
          qc.invalidateQueries({ queryKey: ["debts"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goals", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["goals"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "debt_payments", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["debts"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goal_contributions", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["goals"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expense_categories", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["expense_categories"] });
          qc.invalidateQueries({ queryKey: ["expenses"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "income_categories", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["income_categories"] });
          qc.invalidateQueries({ queryKey: ["incomes"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "telegram_users", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["telegram_users"] }),
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