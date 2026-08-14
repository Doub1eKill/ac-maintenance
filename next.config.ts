import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
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
