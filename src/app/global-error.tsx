"use client"; // Error boundaries must be Client Components

import "./globals.css";

/**
 * Catches errors thrown by the root layout itself (where error.tsx can't
 * reach). This replaces the whole document, so it defines its own <html> and
 * <body>, imports global styles directly, and avoids anything that depends on
 * providers the crashed layout would normally set up (CartProvider, fonts,
 * etc.) — a plain anchor instead of next/link, no Navbar/Footer.
 *
 * Next.js 16.3+ passes `retry`, not the older `reset` — see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md.
 */
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "2rem",
          textAlign: "center",
          background: "#171310",
          color: "#edefdb",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: "#e9694f",
          }}
        >
          Something went wrong
        </p>
        <h1 style={{ margin: 0, maxWidth: "28rem", fontSize: "1.75rem", fontWeight: 800 }}>
          Ember hit a snag loading the page.
        </h1>
        <p style={{ margin: 0, maxWidth: "24rem", fontSize: "0.9rem", opacity: 0.75 }}>
          Nothing was charged. Try reloading, or head back to the menu.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              borderRadius: "999px",
              border: "none",
              background: "#c43518",
              color: "#edefdb",
              padding: "0.75rem 1.5rem",
              fontWeight: 700,
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <a
            href="/menu"
            style={{
              borderRadius: "999px",
              border: "1px solid rgba(237,239,219,0.3)",
              color: "#edefdb",
              padding: "0.75rem 1.5rem",
              fontWeight: 700,
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textDecoration: "none",
            }}
          >
            Back to the menu
          </a>
        </div>
      </body>
    </html>
  );
}
