// Build cross-platform: next build + salin static & public ke standalone (ganti `cp -r`)
const { spawnSync } = require("child_process");
const fs = require("fs");

const r = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
  stdio: "inherit",
});
if (r.status !== 0) process.exit(r.status ?? 1);

fs.cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
fs.cpSync("public", ".next/standalone/public", { recursive: true });

console.log("\n✅ Build selesai — jalankan: npm run start");
