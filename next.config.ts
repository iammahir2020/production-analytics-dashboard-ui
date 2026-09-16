import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pins the workspace root to this project — without it, Turbopack walks up
  // and can pick up an unrelated package-lock.json from the home directory.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
