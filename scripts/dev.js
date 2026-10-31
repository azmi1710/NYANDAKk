// Runner cross-platform: next dev + simpan log ke dev.log (ganti `tee`)
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || "3000";
const logFile = path.join(process.cwd(), "dev.log");
const stream = fs.createWriteStream(logFile, { flags: "w" });

const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev", "-p", PORT], {
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
