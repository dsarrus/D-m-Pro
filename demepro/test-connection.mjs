import pg from "pg";

const url =
  "postgresql://demepro:demepro123@127.0.0.1:5432/demepro_test?schema=public";

const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  const r = await client.query("SELECT 1 as ok");
  console.log("✅ Connexion OK:", r.rows);
} catch (err) {
  console.error("❌ Échec:", err.message);
} finally {
  await client.end();
}
