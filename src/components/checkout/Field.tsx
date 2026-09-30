import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Classes for the label/input/error wrapper — use this for grid placement (e.g. sm:col-span-2). */
  wrapperClassName?: string;
}

function fieldIdFromLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function Field({ label, error, className, wrapperClassName, id, ...rest }: FieldProps) {
  const inputId = id ?? fieldIdFromLabel(label);
  const errorId = `${inputId}-error`;
  const describedBy = [rest["aria-describedby"], error ? errorId : undefined].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      <label htmlFor={inputId} className="font-display text-xs font-bold uppercase tracking-wide text-cream/60">
        {label}
      </label>
      <input
        {...rest}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "focus-ring rounded-2xl border bg-charcoal-raised px-4 py-3 text-sm text-cream placeholder:text-cream/40",
          error ? "border-ember" : "border-cream/15",
          className
        )}
      />
      {error && (
        <p id={errorId} className="text-xs font-semibold text-ember-text">
          {error}
        </p>
      )}
    </div>
  );
}
