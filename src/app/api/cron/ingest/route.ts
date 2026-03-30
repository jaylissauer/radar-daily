import { spawn } from "node:child_process";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

function runIngestScript() {
  return new Promise<{
    ok: boolean;
    code: number | null;
    stdout: string;
    stderr: string;
  }>((resolve) => {
    const child = spawn("node", ["scripts/ingest-news-with-diagnostics.mjs"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("close", (code) => {
      resolve({
        ok: code === 0,
        code,
        stdout,
        stderr,
      });
    });
  });
}

export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!expectedSecret) {
    return Response.json(
      {
        ok: false,
        error: "CRON_SECRET is missing in the environment.",
      },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return Response.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  const result = await runIngestScript();

  return Response.json(
    {
      ok: result.ok,
      code: result.code,
      stdoutTail: result.stdout.slice(-4000),
      stderrTail: result.stderr.slice(-4000),
    },
    { status: result.ok ? 200 : 500 }
  );
}
