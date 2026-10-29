/**
 * The Content-Security-Policy, built per request around a nonce (src/proxy.ts).
 *
 * Until 29 Oct 2026 the policy was static, with script-src 'unsafe-inline' to
 * cover Next's inline bootstrap, and only Report-Only. Mozilla's HTTP
 * Observatory took 20 points off for that 'unsafe-inline'. A nonce lets the
 * scripts Next.js and next-themes write inline run while anything else inline
 * does not; 'strict-dynamic' then lets those scripts load the app's chunks.
 * The price is that every page renders per request (the root layout reads
 * the nonce), which the Next.js guide states and which was measured before
 * this went live.
 *
 * style-src keeps 'unsafe-inline' on purpose: a nonce covers <style> elements
 * but not style="" attributes, and those come from React's style prop and from
 * framer-motion's transforms all over the app. Observatory does not deduct for
 * 'unsafe-inline' in style-src alone.
 *
 * Allowed beyond 'self', as before: the Blob store and Unsplash for photos (as
 * in images.remotePatterns), blob: for the photo picker's local previews,
 * data: for small inline images. Dev adds 'unsafe-eval' (React's error
 * overlays) and ws: for HMR.
 */
export function contentSecurityPolicy(nonce: string, isDev = process.env.NODE_ENV === "development"): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.public.blob.vercel-storage.com https://images.unsplash.com",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "report-uri /api/csp-report",
    "report-to csp",
  ].join("; ");
}

/** A fresh, unguessable nonce for one response. */
export function newNonce(): string {
  return btoa(crypto.randomUUID());
}
