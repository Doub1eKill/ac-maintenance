import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
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
