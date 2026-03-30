import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/cron/ingest": [
      "./scripts/**/*",
      "./node_modules/rss-parser/**/*",
      "./node_modules/slugify/**/*",
      "./node_modules/@supabase/**/*",
      "./node_modules/iceberg-js/**/*",
    ],
  },
};

export default nextConfig;
