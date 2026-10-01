import { ButtonLink } from "@/components/ui/Button";

/**
 * Renders for unmatched routes app-wide, and for an explicit notFound() call
 * in any segment. Inside the root layout (Navbar/Footer still show).
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-ember-text">404</p>
      <h1 className="max-w-md font-display text-3xl font-extrabold text-cream sm:text-4xl">
        This plate isn&apos;t on the menu.
      </h1>
      <p className="max-w-sm text-sm text-cream/70">
        The page you&apos;re looking for doesn&apos;t exist, or has moved.
      </p>
      <ButtonLink href="/menu" className="mt-2">
        Back to the menu
      </ButtonLink>
    </div>
  );
}
