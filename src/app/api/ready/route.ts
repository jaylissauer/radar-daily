import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export async function GET() {
  const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => {
    const value = process.env[key];
    return !value || !String(value).trim();
  });

  return NextResponse.json(
    {
      ok: missingEnvVars.length === 0,
      app: "Radar Daily",
      environment: process.env.NODE_ENV || "development",
      requiredEnvVars: REQUIRED_ENV_VARS,
      missingEnvVars,
      timestamp: new Date().toISOString(),
    },
    {
      status: missingEnvVars.length === 0 ? 200 : 503,
    },
  );
}
