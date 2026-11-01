// Build cross-platform: next build + salin static & public ke standalone (ganti `cp -r`)
const { spawnSync } = require("child_process");
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


const r = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
  stdio: "inherit",
});
if (r.status !== 0) process.exit(r.status ?? 1);

fs.cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
fs.cpSync("public", ".next/standalone/public", { recursive: true });

console.log("\n✅ Build selesai — jalankan: npm run start");
