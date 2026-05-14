import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides the small dev indicator badge so the prototype reads cleanly when
  // walked through on camera. Has no effect on production builds.
  devIndicators: false,
};

export default nextConfig;
