/**
 * Content-Security-Policy for Ember. Built per request by src/proxy.ts with a fresh
 * nonce; Next.js reads the nonce back from the request's CSP header and stamps it on
 * its framework/inline scripts (see node_modules/next/dist/docs/01-app/02-guides/
 * content-security-policy.md).
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'strict-dynamic' lets the nonced bootstrap load the rest of the chunks. React
    // needs eval in development only (debug stack reconstruction).
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    // <style> elements must carry the nonce (Motion's popLayout passes it via MotionConfig).
    // Dev injects un-nonced <style> tags for HMR, so it needs 'unsafe-inline' there.
    "style-src": ["'self'", ...(isDev ? ["'unsafe-inline'"] : [`'nonce-${nonce}'`])],
    // Server-rendered style="" attributes (Motion initial states, progress widths,
    // next/image) can't carry a nonce. Attribute CSS can't run script.
    "style-src-attr": ["'unsafe-inline'"],
    // Remote photos are fetched server-side through /_next/image, so the browser
    // only ever loads same-origin images (plus data:/blob: placeholders).
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"], // next/font self-hosts the Google fonts
    "media-src": ["'self'"],
    // RSC navigation fetches are same-origin; dev adds the HMR websocket.
    "connect-src": ["'self'", ...(isDev ? ["ws:", "wss:"] : [])],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!isDev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}
