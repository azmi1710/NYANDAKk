// Start cross-platform: jalankan server production standalone + log ke server.log
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// ── muat .env (nilai .env menang atas env shell basi) ──
function loadDotenv() {
  try {
    const envFile = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
    for (const line of envFile.split("\n")) {
      const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (m && m[2].length) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}
loadDotenv();

process.env.NODE_ENV = "production";

const logFile = path.join(process.cwd(), "server.log");
const stream = fs.createWriteStream(logFile, { flags: "w" });

const serverJs = path.join(process.cwd(), ".next", "standalone", "server.js");
const child = spawn(process.execPath, [serverJs], {
  stdio: ["ignore", "pipe", "pipe"],
  env: process.env,
});

function pipe(source) {
  source.on("data", (chunk) => {
    process.stdout.write(chunk);
    stream.write(chunk);
  });
}
pipe(child.stdout);
pipe(child.stderr);

child.on("exit", (code) => {
  stream.end();
  process.exit(code ?? 0);
});
process.on("SIGINT", () => { child.kill("SIGINT"); process.exit(0); });
process.on("SIGTERM", () => { child.kill("SIGTERM"); process.exit(0); });
