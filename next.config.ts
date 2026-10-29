import type { NextConfig } from "next";
import path from "path";

// The Content-Security-Policy is not here: it carries a per-request nonce, so
// src/proxy.ts sets it on every page (built in src/lib/csp.ts). It ran as the
// static, nonce-less Report-Only policy from 5 Oct until 29 Oct 2026.

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  // Dev only (ignored by `next build`): the dev server refuses /_next/* asset
  // and HMR requests from any origin but localhost, so a phone on the LAN
  // opening http://192.168.x.x:3000 got the HTML and none of the JavaScript
  // — a page that renders and does nothing when tapped. Private-network
  // ranges are listed so the QR camera can be tried on a real handset;
  // there is no production surface here.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*"],
  experimental: {
    serverActions: {
      // Every upload in this app arrives through a Server Action, and the
      // default cap is 1MB — smaller than a single photo off any phone made in
      // the last decade. Maintenance evidence sends two of them in one request
      // and profile pictures send a third, so the ceiling has to clear several
      // camera originals at once plus multipart overhead. Downscaling does not
      // help here: saveUpload() shrinks the file only after the whole body has
      // already crossed this boundary.
      bodySizeLimit: "25mb",
    },
  },
  images: {
    // Local uploads are same-origin (/uploads/...) and need no entry here;
    // on Vercel they live on the project's Blob store (lib/upload.ts), whose
    // public host is allow-listed by suffix. Unsplash is only here because
    // seed data uses it as a placeholder for work order evidence photos.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // Sent on every response. Vercel already adds HSTS; these are the rest. The
  // CSP comes from src/proxy.ts (it needs a nonce per request); X-Frame-Options
  // covers framing for what the proxy does not touch (API routes, assets).
  // "SAMEORIGIN" rather than "DENY": nothing frames these pages today (the
  // sticker sheet prints from a window.open'd document, not an iframe), but a
  // same-origin frame is not the clickjacking this is for.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // The Reporting API endpoint the CSP's report-to names; browsers
          // without it fall back to report-uri.
          { key: "Reporting-Endpoints", value: 'csp="/api/csp-report"' },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The QR scanner opens the camera (getUserMedia, video only); nothing
          // in the app asks for the microphone, location or payments.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
