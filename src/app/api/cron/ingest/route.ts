import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

function getIngestScriptPath() {
  return path.join(process.cwd(), "scripts", "ingest-news-with-diagnostics.mjs");
}

export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!expectedSecret) {
    return Response.json(
      { ok: false, error: "CRON_SECRET is missing in the environment." },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return Response.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const scriptPath = getIngestScriptPath();

    const { stdout, stderr } = await execFileAsync("node", [scriptPath], {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 1024 * 1024 * 10,
    });

    return Response.json(
      {
        ok: true,
        route: "/api/cron/ingest",
        scriptPath,
        stdoutTail: String(stdout || "").slice(-4000),
        stderrTail: String(stderr || "").slice(-4000),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        route: "/api/cron/ingest",
        error: error?.message || "Unknown error",
        stdoutTail: String(error?.stdout || "").slice(-4000),
        stderrTail: String(error?.stderr || "").slice(-4000),
      },
      { status: 500 }
    );
  }
}
