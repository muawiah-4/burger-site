import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Field({ label, error, className, id, ...rest }: FieldProps) {
  const inputId =
    id ??
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="font-display text-xs font-bold uppercase tracking-wide text-cream/60">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(
          "focus-ring rounded-2xl border bg-charcoal-raised px-4 py-3 text-sm text-cream placeholder:text-cream/60",
          error ? "border-ember" : "border-cream/15",
          className
        )}
        {...rest}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs font-semibold text-ember">
          {error}
        </p>
      )}
    </div>
  );
}
