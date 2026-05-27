import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarDays, ExternalLink } from "lucide-react";
import { listTodayEvents } from "@/lib/google-calendar.functions";
import { Skeleton } from "@/components/ui/skeleton";

export function TodayCalendarEvents() {
  const fn = useServerFn(listTodayEvents);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["gcal", "today"],
    queryFn: () => fn(),
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <CalendarDays size={16} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">События дня</h2>
          <p className="text-xs text-muted-foreground">Google Calendar</p>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <p className="text-xs text-muted-foreground">
          Не удалось загрузить календарь.
        </p>
      ) : !data || data.events.length === 0 ? (
        <p className="text-xs text-muted-foreground">На сегодня свободно ✨</p>
      ) : (
        <ul className="space-y-2">
          {data.events.map((e) => (
            <li
              key={e.id}
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2"
            >
              <div className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">
                {e.all_day || !e.starts_at
                  ? "весь день"
                  : format(new Date(e.starts_at), "HH:mm", { locale: ru })}
              </div>
              <div className="min-w-0 flex-1 truncate text-sm">{e.title}</div>
              {e.html_link && (
                <a
                  href={e.html_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground opacity-60 transition-opacity hover:text-foreground group-hover:opacity-100"
                  aria-label="Открыть в Google Calendar"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}