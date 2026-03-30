import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    app: "Radar Daily",
    environment: process.env.NODE_ENV || "development",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || null,
    vercelEnv: process.env.VERCEL_ENV || null,
    vercelUrl: process.env.VERCEL_URL || null,
    timestamp: new Date().toISOString(),
  });
}
