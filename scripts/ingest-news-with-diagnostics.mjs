import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";

function nodeArgsForScript(scriptPath) {
  if (existsSync(".env.local")) {
    return ["--env-file=.env.local", scriptPath];
  }

  return [scriptPath];
}

async function runNodeScript(scriptPath, label) {
  return new Promise((resolve) => {
    const child = spawn("node", nodeArgsForScript(scriptPath), {
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
        error: code === 0 ? null : `${label} exited with code ${code}`,
      });
    });
  });
}

async function main() {
  const ingestResult = await runNodeScript("scripts/ingest-news.mjs", "ingest-news");

  if (!ingestResult.ok) {
    console.error(ingestResult.error);
    process.exit(ingestResult.code || 1);
  }

  console.log("Cron ingestion complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
