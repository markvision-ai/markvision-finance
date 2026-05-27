import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatGroups(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string | number;
  onValueChange: (v: string) => void;
}

/**
 * Numeric input that shows the value with thousand spaces (1 500 000)
 * while storing a clean digit string via onValueChange.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onValueChange, className, placeholder, ...rest }, ref) => {
    const display = formatGroups(String(value ?? ""));
    return (
      <Input
        {...rest}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        placeholder={placeholder}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          onValueChange(digits);
        }}
        className={cn("font-mono tabular-nums", className)}
      />
    );
  },
);
MoneyInput.displayName = "MoneyInput";