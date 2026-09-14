import type { NextConfig } from "next";
import path from "path";

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
    // Real uploads are same-origin (/uploads/...) and need no entry here.
    // Unsplash is only allow-listed because seed data uses it as a
    // placeholder for work order evidence photos.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
