import { cn } from "@/lib/utils";

/**
 * The one h2 style for the home page. Write titles in normal case; `caps` uppercases
 * them via CSS and is reserved for full-bleed feature bands (the hero H1 is the only
 * other all-caps headline). Eyebrows are always ember-text.
 */
export function SectionHeading({
  label,
  title,
  description,
  align = "left",
  caps = false,
  id,
  className,
}: {
  label: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  caps?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "mx-auto text-center", className)}>
      <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-ember-text">{label}</p>
      <h2
        id={id}
        className={cn(
          "mt-2 font-display text-3xl font-extrabold tracking-tight text-cream sm:text-4xl lg:text-5xl",
          caps && "uppercase"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "mt-3 max-w-xl text-sm leading-relaxed text-cream/70 sm:text-base",
            align === "center" && "mx-auto"
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
