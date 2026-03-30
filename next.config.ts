import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/cron/ingest": [
      "./scripts/**/*",
      "./node_modules/rss-parser/**/*",
      "./node_modules/xml2js/**/*",
      "./node_modules/sax/**/*",
      "./node_modules/xmlbuilder/**/*",
      "./node_modules/slugify/**/*",
      "./node_modules/@supabase/**/*",
      "./node_modules/iceberg-js/**/*"
    ],
  },
};

export default nextConfig;
