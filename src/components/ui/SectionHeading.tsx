export function SectionHeading({
  label,
  title,
  align = "left",
}: {
  label: string;
  title: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-ember-text">{label}</p>
      <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-cream sm:text-4xl lg:text-5xl">
        {title}
      </h2>
    </div>
  );
}
