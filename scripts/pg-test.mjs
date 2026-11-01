// Start PostgreSQL embedded (user-space) untuk testing migrasi SQLite → Postgres
import EmbeddedPostgres from "/tmp/pgtest/node_modules/embedded-postgres/dist/index.js";

try {
  const instance = new EmbeddedPostgres({
    databaseDir: "/tmp/pgtest/data",
    user: "nyandak",
    password: "nyandak",
    port: 5433,
    persistent: false,
  });
  await instance.initialise();
  await instance.start();
  await instance.createDatabase("nyandak");
  console.log("PG-READY");
  setInterval(() => {}, 1 << 30);
} catch (e) {
  console.error("PG-FAIL", e?.message || e);
  process.exit(1);
}
