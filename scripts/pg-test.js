// Start PostgreSQL embedded (user-space) untuk testing migrasi SQLite → Postgres
const EmbeddedPostgres = require("/tmp/pgtest/node_modules/embedded-postgres");

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: "/tmp/pgtest/data",
    user: "nyandak",
    password: "nyandak",
    port: 5433,
    persistent: false,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("nyandak");
  console.log("PG-READY");
  // jaga proses tetap hidup
  setInterval(() => {}, 1 << 30);
}

main().catch((e) => {
  console.error("PG-FAIL", e.message || e);
  process.exit(1);
});
