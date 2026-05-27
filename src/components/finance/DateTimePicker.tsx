import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  /** ISO string with time, or empty */
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  withTime?: boolean;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Выбери дату",
  withTime = true,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const date = useMemo(() => (value ? new Date(value) : undefined), [value]);
  const timeStr = date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : "09:00";

  const commit = (d: Date | undefined, time: string) => {
    if (!d) return;
    const [h, m] = time.split(":").map((x) => parseInt(x, 10) || 0);
    const next = new Date(d);
    next.setHours(h, m, 0, 0);
    onChange(next.toISOString());
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date
            ? format(date, withTime ? "d MMMM yyyy, HH:mm" : "d MMMM yyyy", { locale: ru })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={ru}
          selected={date}
          defaultMonth={date}
          captionLayout="dropdown"
          startMonth={new Date(1970, 0)}
          endMonth={new Date(new Date().getFullYear() + 30, 11)}
          onSelect={(d) => {
            if (d) {
              commit(d, timeStr);
              if (!withTime) setOpen(false);
            }
          }}
          className="p-3 pointer-events-auto"
        />
        {withTime && (
          <div className="flex items-center gap-2 border-t border-border p-3">
            <span className="text-xs text-muted-foreground">Время</span>
            <Input
              type="time"
              value={timeStr}
              onChange={(e) => commit(date ?? new Date(), e.target.value)}
              className="w-32"
            />
            <Button type="button" size="sm" className="ml-auto" onClick={() => setOpen(false)}>
              Готово
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}